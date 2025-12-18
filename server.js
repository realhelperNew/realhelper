const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Persistent store (SQLite) + optional SendGrid integration
const sqlite3 = require('sqlite3').verbose();
const dbFile = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbFile);

// Initialize table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    date TEXT
  )`);
});

const subscribers = null; // kept for compatibility in case needed

// Optional SendGrid
let sgMail = null;
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (e) {
    console.warn('SendGrid module not available or failed to initialize');
    sgMail = null;
  }
}
const testimonials = [
  { name: 'Sara A.', text: 'خدمة ممتازة وسهلة الاستخدام!' },
  { name: 'Omar M.', text: 'حققت نتائج رائعة خلال أيام.' },
  { name: 'Lina S.', text: 'دعم محترف وتجربة سلسة.' }
];

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/testimonials', (req, res) => {
  res.json(testimonials);
});

app.post('/api/subscribe', (req, res) => {
  const { email, name } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'البريد الإلكتروني غير صالح' });
  }
  const now = new Date().toISOString();
  const stmt = db.prepare('INSERT OR IGNORE INTO subscribers (email, name, date) VALUES (?,?,?)');
  stmt.run(email, name || null, now, function(err) {
    if (err) return res.status(500).json({ ok: false, error: 'خطأ بالخادم عند التخزين' });
    if (this.changes === 0) return res.status(200).json({ ok: true, message: 'تم التسجيل سابقاً' });

    // Optionally send a confirmation email via SendGrid if configured
    if (sgMail) {
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM || 'noreply@realhelper.example',
        subject: 'تم التسجيل في RealHelper',
        text: `شكرًا لتسجيلك في RealHelper${name ? '، ' + name : ''}!`,
        html: `<p>شكرًا لتسجيلك في <strong>RealHelper</strong>${name ? ', ' + name : ''}!</p>`
      };
      sgMail.send(msg).catch(e => console.warn('SendGrid send failed:', e.message || e));
    }

    return res.json({ ok: true, message: 'تم التسجيل بنجاح' });
  });
  stmt.finalize();
});

// Fallback to index.html for SPA-friendly routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
