const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Persistent store (SQLite) + optional SendGrid integration
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');

// File-based local storage: one folder per user under data/users/
const usersDir = path.join(__dirname, 'data', 'users');
async function ensureUsersDir(){
  await fsp.mkdir(usersDir, { recursive: true });
}

function sanitizeId(email){
  // create a stable id for a given email
  return encodeURIComponent(email.toLowerCase());
}

async function saveProfile(email, name){
  await ensureUsersDir();
  const id = sanitizeId(email);
  const dir = path.join(usersDir, id);
  await fsp.mkdir(dir, { recursive: true });
  const profile = { email, name: name || null, createdAt: new Date().toISOString() };
  await fsp.writeFile(path.join(dir, 'profile.json'), JSON.stringify(profile, null, 2));
  await fsp.mkdir(path.join(dir, 'requests'), { recursive: true });
  return id;
}

async function saveRequestFor(email, payload){
  const id = sanitizeId(email);
  const userDir = path.join(usersDir, id);
  await fsp.mkdir(userDir, { recursive: true });
  await fsp.mkdir(path.join(userDir, 'requests'), { recursive: true });
  const ts = Date.now();
  const fn = path.join(userDir, 'requests', `${ts}.json`);
  await fsp.writeFile(fn, JSON.stringify(payload, null, 2));
  return fn;
}

// Optional SendGrid (only if env var set and package installed)
let sgMail = null;
try{
  if (process.env.SENDGRID_API_KEY) {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }
}catch(e){
  sgMail = null;
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

app.post('/api/subscribe', async (req, res) => {
  const { email, name } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'البريد الإلكتروني غير صالح' });
  }
  try{
    const id = await saveProfile(email, name);
    // optional sendgrid
    if (sgMail) {
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM || 'noreply@realhelper.example',
        subject: 'تم التسجيل في RealHelper',
        text: `شكرًا لتسجيلك في RealHelper${name ? '، ' + name : ''}!`,
        html: `<p>شكرًا لتسجيلك في <strong>RealHelper</strong>${name ? ', ' + name : ''}!</p>`
      };
      sgMail.send(msg).catch(() => {});
    }
    return res.json({ ok: true, message: 'تم التسجيل بنجاح', id });
  }catch(e){
    return res.status(500).json({ ok: false, error: 'خطأ عند حفظ البيانات' });
  }
});

// New: save a detailed user request and optionally return share links
app.post('/api/request', async (req, res) => {
  const body = req.body || {};
  const { email, name, budget, timing, location, details, desired_details, undesired_details, send_to } = body;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'البريد الإلكتروني غير صالح' });
  }
  const payload = {
    email, name: name || null, budget: budget || null, timing: timing || null,
    location: location || null, details: details || null,
    desired_details: desired_details || null, undesired_details: undesired_details || null,
    send_to: Array.isArray(send_to) ? send_to : [],
    createdAt: new Date().toISOString()
  };
  try{
    await saveProfile(email, name);
    const savedPath = await saveRequestFor(email, payload);

    // Construct shareable message (Arabic)
    let parts = [];
    parts.push(`طلب من ${name || email}`);
    if (budget) parts.push(`الميزانية: ${budget}`);
    if (timing) parts.push(`التوقيت: ${timing}`);
    if (location) parts.push(`المكان: ${location}`);
    if (details) parts.push(`التفاصيل: ${details}`);
    if (desired_details) parts.push(`التفاصيل المطلوبة: ${desired_details}`);
    if (undesired_details) parts.push(`التفاصيل غير المرغوبة: ${undesired_details}`);
    parts.push('(مُرسل من RealHelper)');

    const msgText = parts.join('\n');
    const encoded = encodeURIComponent(msgText);

    const links = {};
    const destinations = Array.isArray(send_to) ? send_to : [];
    if (destinations.includes('whatsapp')){
      links.whatsapp = `https://wa.me/?text=${encoded}`;
    }
    if (destinations.includes('telegram')){
      links.telegram = `https://t.me/share/url?url=&text=${encoded}`;
    }
    if (destinations.includes('twitter') || destinations.includes('x')){
      links.twitter = `https://twitter.com/intent/tweet?text=${encoded}`;
    }
    if (destinations.includes('tiktok')){
      links.tiktok = { note: 'انسخ النص التالي والصقه في تيك توك أو رسالة خاصة:', text: msgText };
    }

    return res.json({ ok: true, saved: savedPath, links });
  }catch(e){
    console.error('save request error', e);
    return res.status(500).json({ ok: false, error: 'فشل حفظ الطلب' });
  }
});

// Fallback to index.html for SPA-friendly routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
