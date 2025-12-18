const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory stores (demo)
const subscribers = [];
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
  const exists = subscribers.find(s => s.email === email);
  if (exists) return res.status(200).json({ ok: true, message: 'تم التسجيل سابقاً' });
  subscribers.push({ email, name: name || null, date: new Date().toISOString() });
  return res.json({ ok: true, message: 'تم التسجيل بنجاح' });
});

// Fallback to index.html for SPA-friendly routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
