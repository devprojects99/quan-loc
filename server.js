const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // BẮT BUỘC đặt khi chạy
// Email notification config
const EMAIL_USER = process.env.EMAIL_USER || 'nguyenquanloc00@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || null; // app password or SMTP password
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'nguyenquanloc00@gmail.com';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'visits.json');
const MAX_VISITS = 500;

// Khi chạy sau proxy (Render, Railway, Nginx, Cloudflare...) để req.ip lấy đúng IP khách
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));

// Chỉ công khai thư mục public/ (KHÔNG công khai server.js, data/...)
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', dotfiles: 'ignore' }));

// ---------- Lưu trữ ----------
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}
function readVisits() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeVisits(entries) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

// ---------- Tiện ích ----------
const clip = (v, n = 300) => String(v ?? '').slice(0, n);
const normalizeIp = (ip) => (ip ? String(ip).replace(/^::ffff:/, '') : 'unknown');

function isPrivateIp(ip) {
  return (
    !ip || ip === 'unknown' || ip === '::1' || ip === 'localhost' ||
    /^127\./.test(ip) || /^10\./.test(ip) || /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || /^(fc|fd|fe80)/i.test(ip)
  );
}

function getBrowser(ua = '') {
  if (/Edg|Edge/i.test(ua)) return 'Microsoft Edge';
  if (/OPR|Opera/i.test(ua)) return 'Opera';
  if (/Firefox/i.test(ua)) return 'Mozilla Firefox';
  if (/Chrome/i.test(ua)) return 'Google Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'Unknown';
}
function getDevice(ua = '') {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone/iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

// ---------- Định vị theo IP (có cache để không bị giới hạn lượt gọi) ----------
const geoCache = new Map(); // ip -> { data, at }
const GEO_TTL = 24 * 60 * 60 * 1000;

async function getGeo(ip) {
  if (isPrivateIp(ip)) return { country: 'Local', region: 'Local', city: 'Localhost' };
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_TTL) return cached.data;

  let data = { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
  try {
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const j = await r.json();
      if (!j.error) {
        data = {
          country: j.country_name || 'Unknown',
          region: j.region || 'Unknown',
          city: j.city || 'Unknown',
          latitude: j.latitude ?? null,
          longitude: j.longitude ?? null,
          timezone: j.timezone || null,
          org: j.org || null,
        };
        geoCache.set(ip, { data, at: Date.now() });
      }
    }
  } catch { /* giữ giá trị Unknown */ }
  return data;
}

// ---------- Đăng nhập admin (HTTP Basic) ----------
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).send('Chưa đặt biến môi trường ADMIN_PASSWORD nên dashboard đang bị khóa.');
  }
  const h = req.headers.authorization || '';
  if (h.startsWith('Basic ')) {
    const decoded = Buffer.from(h.slice(6), 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    const user = decoded.slice(0, i);
    const pass = decoded.slice(i + 1);
    if (i > -1 && safeEqual(user, ADMIN_USER) && safeEqual(pass, ADMIN_PASSWORD)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Dashboard", charset="UTF-8"').status(401).send('Cần đăng nhập');
}

// ---------- Realtime (Server-Sent Events) ----------
const clients = new Set();
function broadcast(record) {
  const msg = `data: ${JSON.stringify(record)}\n\n`;
  for (const res of clients) res.write(msg);
}

// ---------- Email notifications (nodemailer) ----------
let mailTransporter = null;
function getTransporter() {
  if (mailTransporter) return mailTransporter;
  if (!EMAIL_PASS) return null;
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });
  return mailTransporter;
}

async function sendNotification(record) {
  const transporter = getTransporter();
  if (!transporter) return; // not configured
  const subject = `New visit: ${record.ip} — ${record.country} ${record.city}`;
  const text = `New visit recorded:\n\nIP: ${record.ip}\nTime: ${record.visitedAt}\nLocation: ${record.city}, ${record.region}, ${record.country}\nISP: ${record.org || '—'}\nDevice: ${record.device} | Browser: ${record.browser}\nReferrer: ${record.referrer || 'Direct'}`;
  try {
    await transporter.sendMail({ from: EMAIL_USER, to: NOTIFY_EMAIL, subject, text });
  } catch (err) {
    console.error('Failed to send notification email:', err && err.message ? err.message : err);
  }
}

// ---------- API ----------
app.get('/health', (req, res) => res.json({ ok: true }));

const lastSeen = new Map(); // chống ghi trùng: cùng IP trong 60 giây
app.post('/api/track', async (req, res) => {
  const ip = normalizeIp(req.ip);
  const now = Date.now();
  if (now - (lastSeen.get(ip) || 0) < 60_000) return res.json({ ok: true, duplicate: true });
  lastSeen.set(ip, now);

  const ua = req.headers['user-agent'] || '';
  const geo = await getGeo(ip);
  const record = {
    id: now + crypto.randomBytes(4).toString('hex'),
    ip,
    browser: getBrowser(ua),
    device: getDevice(ua),
    country: geo.country,
    region: geo.region,
    city: geo.city,
    latitude: geo.latitude ?? null,
    longitude: geo.longitude ?? null,
    timezone: geo.timezone ?? null,
    org: geo.org ?? null,
    referrer: clip(req.headers.referer || 'Direct'),
    visitedAt: new Date(now).toISOString(),
  };

  const visits = readVisits();
  visits.unshift(record);
  writeVisits(visits.slice(0, MAX_VISITS));
  broadcast(record);

  // send email notification (fire-and-forget)
  sendNotification(record).catch(() => {});

  res.json({ ok: true }); // không trả IP/vị trí về cho khách
});

app.get('/api/visits', requireAdmin, (req, res) => res.json(readVisits()));

app.get('/api/stream', requireAdmin, (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(res); });
});

// Xóa toàn bộ lịch sử (cần header tùy chỉnh để chống CSRF)
app.post('/api/visits/clear', requireAdmin, (req, res) => {
  if (req.get('x-admin-action') !== 'clear') return res.status(400).json({ ok: false });
  writeVisits([]);
  res.json({ ok: true });
});

app.get('/dashboard', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/admin', (req, res) => res.redirect('/dashboard'));

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard (user: ${ADMIN_USER})`);
  if (!ADMIN_PASSWORD) console.warn('⚠ Chưa đặt ADMIN_PASSWORD, dashboard sẽ bị khóa.');
});
