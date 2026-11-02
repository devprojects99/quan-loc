const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

// 1. Hiệu ứng theo dõi chuột (Glow Background)
document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    $('#glow').style.setProperty('--x', `${x}px`);
    $('#glow').style.setProperty('--y', `${y}px`);
});

// 2. Hiệu ứng chữ đánh máy (Typing Effect)
const roles = ["sinh viên CNTT 💻", "người đam mê âm nhạc 🎧", "kẻ mộng mơ trên mây ☁️"];
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;
const roleEl = $('#role');

function typeEffect() {
    const currentRole = roles[roleIndex];
    if (isDeleting) {
        charIndex--;
    } else {
        charIndex++;
    }

    roleEl.textContent = currentRole.substring(0, charIndex);

    let typeSpeed = isDeleting ? 50 : 100;

    if (!isDeleting && charIndex === currentRole.length) {
        typeSpeed = 2000; // Dừng lại khi gõ xong
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typeSpeed = 500;
    }

    setTimeout(typeEffect, typeSpeed);
}
typeEffect();

// 3. Hiệu ứng 3D Tilt (Nghiêng thẻ khi rê chuột)
const tiltCards = $$('.tilt-card');
tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10; // Đảo ngược trục Y
        const rotateY = ((x - centerX) / centerX) * 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        card.style.transition = 'transform 0.5s ease';
    });

    card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.1s ease';
    });
});

// 4. Scroll Animation (Reveal) & Đổi màu Navigation
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');
            
            // Đổi active link nav
            if(entry.target.tagName === 'HEADER' || entry.target.tagName === 'SECTION') {
                const id = entry.target.getAttribute('id');
                $$('.glass-nav a').forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        }
    });
}, { threshold: 0.2 });

$$('.rv, header, section').forEach(el => observer.observe(el));

// 5. Hệ thống chòm sao (Chuyển tab)
const starData = [
    { title: "🎬 Phim ảnh", desc: "Mỗi bộ phim hay đều có cách chạm vào lòng người theo một cách rất riêng." },
    { title: "🎧 Âm nhạc", desc: "Những giai điệu điện tử (Synthwave/Cyberpunk) là thứ giữ nhịp tim mình." },
    { title: "📖 Khám phá", desc: "Một chương mã nguồn mở hay một cuốn sách đều mở ra chân trời mới." }
];

const starNodes = $$('.star-node');
starNodes.forEach(node => {
    node.addEventListener('click', (e) => {
        starNodes.forEach(n => n.classList.remove('active'));
        e.target.classList.add('active');
        const index = e.target.getAttribute('data-index');
        $('#starTitle').textContent = starData[index].title;
        $('#starDesc').textContent = starData[index].desc;
    });
});
starNodes[0].classList.add('active');

// 6. Vũ trụ Canvas (Background)
const cv = $('#space');
const cx = cv.getContext('2d');
let W, H;
let stars = [];
let meteors = [];

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W;
    cv.height = H;
    initStars();
}
window.addEventListener('resize', resize);

function initStars() {
    stars = [];
    for(let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.5,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

let fxEnabled = true;
$('#fxBtn').addEventListener('click', function() {
    fxEnabled = !fxEnabled;
    this.style.opacity = fxEnabled ? '1' : '0.5';
});

function drawSpace() {
    cx.clearRect(0, 0, W, H);
    
    // Vẽ sao
    cx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    stars.forEach(s => {
        cx.beginPath();
        cx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        cx.fill();
        s.y -= s.speed; // Bay lên trên
        if(s.y < 0) s.y = H;
    });

    // Vẽ sao băng
    if (fxEnabled) {
        if (Math.random() < 0.02 && meteors.length < 3) {
            meteors.push({ x: Math.random() * W, y: -50, len: Math.random() * 80 + 50, speed: Math.random() * 10 + 10 });
        }
        meteors = meteors.filter(m => m.y < H + 100);
        meteors.forEach(m => {
            const grad = cx.createLinearGradient(m.x, m.y, m.x - m.len, m.y - m.len);
            grad.addColorStop(0, 'rgba(0, 240, 255, 1)');
            grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
            cx.strokeStyle = grad;
            cx.lineWidth = 2;
            cx.beginPath();
            cx.moveTo(m.x, m.y);
            cx.lineTo(m.x - m.len, m.y - m.len);
            cx.stroke();
            m.x += m.speed;
            m.y += m.speed;
        });
    }

    requestAnimationFrame(drawSpace);
}
resize();
drawSpace();

// 7. Guestbook form + modal + localStorage
const guestbookKey = 'quanloc_guestbook_messages';
const guestbookForm = document.getElementById('guestbookForm');
const guestbookList = document.getElementById('guestbookList');
const guestbookModal = document.getElementById('guestbookModal');
const openGuestbookBtn = document.getElementById('openGuestbook');
const closeGuestbookBtn = document.getElementById('closeGuestbook');
const cancelGuestbookBtn = document.getElementById('cancelGuestbook');
const clearGuestbookBtn = document.getElementById('clearGuestbook');

function getGuestbookMessages() {
    try {
        const stored = JSON.parse(localStorage.getItem(guestbookKey) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
}

function saveGuestbookMessages(messages) {
    localStorage.setItem(guestbookKey, JSON.stringify(messages));
}

function createGuestbookItem(entry, index) {
    const item = document.createElement('div');
    item.className = 'guestbook-item';

    const name = document.createElement('strong');
    name.textContent = entry.name;

    const message = document.createElement('p');
    message.textContent = entry.message;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'guestbook-delete';
    deleteBtn.title = 'Xóa tin nhắn';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
        const messages = getGuestbookMessages();
        const updated = messages.filter((_, i) => i !== index);
        saveGuestbookMessages(updated);
        renderGuestbook(updated);
    });

    item.appendChild(name);
    item.appendChild(message);
    item.appendChild(deleteBtn);
    return item;
}

function renderGuestbook(messages) {
    if (!guestbookList) return;
    guestbookList.innerHTML = '';

    if (!messages.length) {
        const empty = document.createElement('div');
        empty.className = 'guestbook-item';
        const text = document.createElement('p');
        text.textContent = 'Chưa có lời nhắn nào. Hãy là người đầu tiên gửi một điều gì đó thật dịu dàng.';
        empty.appendChild(text);
        guestbookList.appendChild(empty);
        return;
    }

    messages.forEach((entry, index) => {
        guestbookList.appendChild(createGuestbookItem(entry, index));
    });
}

function openGuestbookModal() {
    if (!guestbookModal) return;
    guestbookModal.classList.add('is-open');
    guestbookModal.setAttribute('aria-hidden', 'false');
    const firstInput = document.getElementById('guestName');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeGuestbookModal() {
    if (!guestbookModal) return;
    guestbookModal.classList.remove('is-open');
    guestbookModal.setAttribute('aria-hidden', 'true');
}

if (guestbookForm && guestbookList) {
    const savedMessages = getGuestbookMessages();
    const initialMessages = savedMessages.length ? savedMessages : [
        { name: 'Quan Lộc', message: 'Chúc mọi đường đi đều có ánh sáng và những điều đẹp đến đúng lúc.' }
    ];
    renderGuestbook(initialMessages);

    guestbookForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('guestName');
        const messageInput = document.getElementById('guestMessage');
        const name = nameInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !message) return;

        const messages = getGuestbookMessages();
        const newEntry = { name, message };
        const updated = [newEntry, ...messages];

        saveGuestbookMessages(updated);
        renderGuestbook(updated);
        guestbookForm.reset();
        closeGuestbookModal();
    });
}

if (openGuestbookBtn) {
    openGuestbookBtn.addEventListener('click', openGuestbookModal);
}

if (closeGuestbookBtn) {
    closeGuestbookBtn.addEventListener('click', closeGuestbookModal);
}

if (cancelGuestbookBtn) {
    cancelGuestbookBtn.addEventListener('click', closeGuestbookModal);
}

if (guestbookModal) {
    guestbookModal.addEventListener('click', (e) => {
        if (e.target && e.target.dataset.close === 'true') {
            closeGuestbookModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && guestbookModal.classList.contains('is-open')) {
            closeGuestbookModal();
        }
    });
}

if (clearGuestbookBtn) {
    clearGuestbookBtn.addEventListener('click', () => {
        saveGuestbookMessages([]);
        renderGuestbook([]);
    });
}