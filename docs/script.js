document.addEventListener('DOMContentLoaded', () => {
  // Typing effect for hero
  const typedEl = document.getElementById('typed');
  const words = ['أدوات تساعدك', 'تسهل عملك', 'تُطوِّر نشاطك'];
  let idx = 0, char = 0, forward = true;
  setInterval(() => {
    const w = words[idx];
    if (forward) {
      char++;
      typedEl.textContent = w.slice(0, char);
      if (char === w.length) { forward = false; setTimeout(()=>{}, 700); }
    } else {
      char--;
      typedEl.textContent = w.slice(0, char);
      if (char === 0) { forward = true; idx = (idx+1) % words.length; }
    }
  }, 120);

  // Subscribe form
  const form = document.getElementById('subscribe-form');
  const emailInput = document.getElementById('email');
  const msg = document.getElementById('subscribe-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.textContent = 'الرجاء إدخال بريد إلكتروني صالح';
      return;
    }
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email })
      });
      const data = await res.json();
      msg.textContent = data.message || (data.ok ? 'تم التسجيل بنجاح' : 'حصل خطأ');
      if (data.ok) { emailInput.value = ''; }
        if (data.ok){
          try{ localStorage.setItem('realhelper_email', email); loadProfile(email); }catch(e){}
        }
    } catch (err) {
      msg.textContent = 'فشل الاتصال بالخادم';
    }
  });

  // Load profile and show in UI if email stored or provided
  const profileArea = document.getElementById('profile-area');
  async function loadProfile(email){
    if (!email) return;
    try{
      const r = await fetch('/api/profile?email=' + encodeURIComponent(email));
      const j = await r.json();
      if (j.ok && j.profile){
        const n = j.profile.name || j.profile.email;
        if (profileArea) profileArea.textContent = `مرحبًا، ${n}`;
      }
    }catch(e){ /* ignore */ }
  }

  // Auto-load profile on page load if email is stored
  try{
    const stored = localStorage.getItem('realhelper_email');
    if (stored) loadProfile(stored);
  }catch(e){}
  // Testimonials carousel
  const slide = document.getElementById('testi-slide');
  const prevBtn = document.querySelector('.nav.prev');
  const nextBtn = document.querySelector('.nav.next');
  let testimonials = [];
  let cur = 0;

  async function loadTestimonials(){
    try{
      const r = await fetch('/api/testimonials');
      testimonials = await r.json();
      render();
      startAuto();
    }catch(e){ slide.textContent = 'لا يوجد شهادات حالياً'; }
  }

  function render(){
    if (!testimonials.length) return;
    const t = testimonials[cur];
    slide.innerHTML = `<blockquote>"${t.text}"</blockquote><strong>${t.name}</strong>`;
  }

  prevBtn.addEventListener('click', ()=>{ if(testimonials.length){ cur=(cur-1+testimonials.length)%testimonials.length; render(); } });
  nextBtn.addEventListener('click', ()=>{ if(testimonials.length){ cur=(cur+1)%testimonials.length; render(); } });

  let autoInt = null;
  function startAuto(){ if(autoInt) clearInterval(autoInt); autoInt = setInterval(()=>{ nextBtn.click(); }, 4000); }

  loadTestimonials();

  // Request form handling
  const reqForm = document.getElementById('request-form');
  const reqResult = document.getElementById('request-result');
  if (reqForm){
    reqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      reqResult.textContent = '';
      const name = document.getElementById('r-name').value.trim();
      const email = document.getElementById('r-email').value.trim();
      const budget = document.getElementById('r-budget').value.trim();
      const timing = document.getElementById('r-timing').value.trim();
      const location = document.getElementById('r-location').value.trim();
      const details = document.getElementById('r-details').value.trim();
      const desired = document.getElementById('r-desired').value.trim();
      const undesired = document.getElementById('r-undesired').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
        reqResult.textContent = 'الرجاء إدخال بريد إلكتروني صالح للمتابعة';
        return;
      }
      const sends = Array.from(reqForm.querySelectorAll('input[name="send_to"]:checked')).map(n=>n.value);
      const payload = { email, name, budget, timing, location, details, desired_details: desired, undesired_details: undesired, send_to: sends };
      try{
        const r = await fetch('/api/request', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const data = await r.json();
        if (!data.ok) return reqResult.textContent = data.error || 'فشل إرسال الطلب';
        // show links
        const links = data.links || {};
        const parts = [];
        if (links.telegram) parts.push(`<a href="${links.telegram}" target="_blank" rel="noopener">مشاركة عبر تلغرام</a>`);
        if (links.twitter) parts.push(`<a href="${links.twitter}" target="_blank" rel="noopener">مشاركة عبر تويتر</a>`);
        if (links.tiktok) parts.push(`<div><strong>تيك توك:</strong><div>${links.tiktok.note}</div><pre style="white-space:pre-wrap">${escapeHtml(links.tiktok.text)}</pre></div>`);
        reqResult.innerHTML = parts.length ? parts.join(' · ') : 'تم حفظ الطلب بنجاح';
        reqForm.reset();
      }catch(err){
        reqResult.textContent = 'فشل الاتصال بالخادم';
      }
    });
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
});
