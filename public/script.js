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
    } catch (err) {
      msg.textContent = 'فشل الاتصال بالخادم';
    }
  });

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
});
