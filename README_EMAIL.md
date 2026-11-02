Email notifications setup
=========================

This project can send an email to notify about each new visit. Configure the following environment variables before starting the server:

- `ADMIN_PASSWORD` (required) — password for dashboard admin basic auth.
- `EMAIL_USER` — Gmail address used to send emails (default: nguyenquanloc00@gmail.com).
- `EMAIL_PASS` — App password or SMTP password for the sending Gmail account (required to send emails).
- `NOTIFY_EMAIL` — Destination email to receive notifications (default: nguyenquanloc00@gmail.com).

Example (Windows PowerShell):

```powershell
$env:ADMIN_PASSWORD = 'your_admin_password'
$env:EMAIL_USER = 'your_sender@gmail.com'
$env:EMAIL_PASS = 'your_app_password'
$env:NOTIFY_EMAIL = 'nguyenquanloc00@gmail.com'
node server.js
```

Notes
- Use an App Password for Gmail when using 2FA-enabled accounts.
- Sending one email per visit can generate a lot of email; consider batching if traffic grows.
