// CURSOR (desktop only)
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
const isTouch = window.matchMedia('(hover:none)').matches;
if (cursor && ring && !isTouch) {
  let mx=0,my=0,rx=0,ry=0,started=false;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!started){started=true;cursor.style.opacity='1';ring.style.opacity='1';}});
  cursor.style.opacity='0'; ring.style.opacity='0';
  function animateCursor(){
    cursor.style.transform=`translate(${mx-4}px,${my-4}px)`;
    rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
    ring.style.transform=`translate(${rx-18}px,${ry-18}px)`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();
  document.querySelectorAll('a,button,.grid-card,.faq-item,.service-card,.wsc,.process-step').forEach(el=>{
    el.addEventListener('mouseenter',()=>ring.classList.add('hover'));
    el.addEventListener('mouseleave',()=>ring.classList.remove('hover'));
  });
}

// MOBILE NAV
const mobileBtn = document.getElementById('navMobileBtn');
const navLinks = document.querySelector('.nav-links');
const navParent = navLinks ? navLinks.parentNode : null;

// Backdrop overlay
const navBackdrop = document.createElement('div');
navBackdrop.className = 'nav-backdrop';
document.body.appendChild(navBackdrop);

function openMobileNav() {
  document.body.appendChild(navLinks);
  navLinks.style.height = window.innerHeight + 'px';
  navLinks.classList.add('open');
  document.body.classList.add('nav-open');
  mobileBtn.classList.add('is-open');
  mobileBtn.setAttribute('aria-label', 'Cerrar menú');
  mobileBtn.innerHTML = '&#10005;';
  navLinks.appendChild(mobileBtn);
}

function closeMobileNav() {
  if (navParent) navParent.appendChild(mobileBtn);
  navLinks.classList.remove('open');
  navLinks.style.height = '';
  document.body.classList.remove('nav-open');
  mobileBtn.classList.remove('is-open');
  mobileBtn.setAttribute('aria-label', 'Menú');
  mobileBtn.innerHTML = '&#9776;';
  if (navParent) navParent.insertBefore(navLinks, mobileBtn);
}

if (mobileBtn && navLinks) {
  mobileBtn.addEventListener('click', () => {
    navLinks.classList.contains('open') ? closeMobileNav() : openMobileNav();
  });
  navBackdrop.addEventListener('click', closeMobileNav);
  navLinks.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    const isDropdownToggle = link.closest('.has-dropdown') && link.parentElement.classList.contains('has-dropdown');
    if (isDropdownToggle && window.innerWidth <= 900) {
      e.preventDefault();
      link.closest('.has-dropdown').classList.toggle('dd-open');
      return;
    }
    if (window.innerWidth <= 900) closeMobileNav();
  });
}

// GTM — solo carga con consentimiento
function loadGTM() {
  if (window._gtmLoaded) return;
  window._gtmLoaded = true;
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NVWMWFW6');
}
if (localStorage.getItem('cookie_consent') === 'accepted') loadGTM();

// COOKIE BANNER
document.addEventListener('DOMContentLoaded',function(){
  if(localStorage.getItem('cookie_consent')) return;
  const banner = document.getElementById('cookieBanner');
  if(!banner) return;
  setTimeout(()=>banner.classList.add('show'), 800);
  document.getElementById('cookieAccept').addEventListener('click',()=>{
    localStorage.setItem('cookie_consent','accepted');
    banner.classList.remove('show');
    loadGTM();
  });
  document.getElementById('cookieReject').addEventListener('click',()=>{
    localStorage.setItem('cookie_consent','rejected');
    banner.classList.remove('show');
  });
});

// SCROLL ANIMATIONS
const animatedSelector = '.fade-up,.slide-left,.slide-right,.fade-scale,.stats-row .stat-box.fade-up,.page-hero .fade-up';
const observer = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
},{threshold:0.1});

// Service pages — staggered entrance animations
document.querySelectorAll('.page-hero').forEach(hero => {
  hero.classList.add('fade-up');
  hero.querySelectorAll('.page-hero-label, h1, .page-hero-desc, .page-hero > div:not(.page-hero-line)').forEach((el, i) => {
    el.classList.add('fade-up');
    el.style.setProperty('--delay', `${i * 0.08}s`);
  });
});
document.querySelectorAll('.stats-row .stat-box').forEach((box, i) => {
  box.classList.add('fade-up');
  box.style.setProperty('--delay', `${i * 0.08}s`);
});
document.querySelectorAll('.two-col-content .prose').forEach(el => {
  if (!el.classList.contains('slide-left')) el.classList.add('slide-left');
});
document.querySelectorAll('.two-col-content > div:not(.prose)').forEach(el => {
  if (!el.classList.contains('slide-right')) el.classList.add('slide-right');
});
document.querySelectorAll('.cta-strip').forEach(el => {
  if (!el.classList.contains('fade-up')) el.classList.add('fade-up');
});
document.querySelectorAll('section .section-label, section .section-title').forEach((el, i) => {
  if (!el.classList.contains('fade-up')) {
    el.classList.add('fade-up');
    el.style.setProperty('--delay', `${(i % 3) * 0.06}s`);
  }
});
document.querySelectorAll('.tldr-box').forEach(el => {
  if (!el.classList.contains('fade-scale')) el.classList.add('fade-scale');
});
document.querySelectorAll(animatedSelector).forEach(el=>observer.observe(el));

// STAT COUNTERS (home)
function animateStat(el) {
  if (el.dataset.statAnimated === '1') return;
  if (el.dataset.statType === 'text') {
    el.dataset.statAnimated = '1';
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.dataset.statAnimated = '1';
    return;
  }
  el.dataset.statAnimated = '1';
  const end = parseFloat(el.dataset.statValue || '0');
  const prefix = el.dataset.statPrefix || '';
  const suffix = el.dataset.statSuffix || '';
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = Math.round(end * eased);
    el.textContent = prefix + current + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const statObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) animateStat(e.target);
  });
}, { threshold: 0.4 });
document.querySelectorAll('[data-stat-value]').forEach(el => statObserver.observe(el));

// SMOOTH NAV
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const t=document.querySelector(a.getAttribute('href'));
    if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}
  });
});

// ACTIVE NAV
const path = window.location.pathname;
document.querySelectorAll('.nav-links a').forEach(a=>{
  if(a.getAttribute('href')===path || (path.includes(a.getAttribute('href')) && a.getAttribute('href')!=='/' && a.getAttribute('href')!=='/index.html')){
    a.classList.add('active');
  }
});

// NAV — solid on scroll
const siteNav = document.querySelector('body > nav');
if (siteNav) {
  const onNavScroll = () => siteNav.classList.toggle('nav-scrolled', window.scrollY > 48);
  onNavScroll();
  window.addEventListener('scroll', onNavScroll, { passive: true });
}

// HERO — parallax suave (throttled a un cálculo por frame para evitar jank en scroll)
const heroParallax = document.querySelector('[data-hero-parallax]');
if (heroParallax && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let heroTicking = false;
  window.addEventListener('scroll', () => {
    if (heroTicking) return;
    heroTicking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < window.innerHeight * 1.1) {
        heroParallax.style.transform = `translate3d(0, ${y * 0.14}px, 0) scale(1.06)`;
      }
      heroTicking = false;
    });
  }, { passive: true });
}

// FAQ acordeón
function initFaqAccordion() {
  document.querySelectorAll('.faq-list').forEach(list => {
    const items = list.querySelectorAll('.faq-item');
    items.forEach((item, index) => {
      let btn = item.querySelector('.faq-q');
      const answer = item.querySelector('.faq-a');
      if (!btn || !answer) return;

      if (btn.tagName !== 'BUTTON') {
        const newBtn = document.createElement('button');
        newBtn.type = 'button';
        newBtn.className = 'faq-q';
        newBtn.innerHTML = btn.innerHTML;
        btn.replaceWith(newBtn);
        btn = newBtn;
      }

      let panel = answer.closest('.faq-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'faq-panel';
        answer.parentNode.insertBefore(panel, answer);
        panel.appendChild(answer);
      }

      const panelId = panel.id || `faq-${Math.random().toString(36).slice(2, 9)}`;
      panel.id = panelId;
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', panelId);

      if (index === 0) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        items.forEach(el => {
          el.classList.remove('is-open');
          const q = el.querySelector('.faq-q');
          if (q) q.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });
}
initFaqAccordion();

// Sidebar servicio — highlight al hacer scroll
const serviceSidebar = document.querySelector('.service-sidebar-card');
if (serviceSidebar) {
  const sideObs = new IntersectionObserver(([e]) => {
    serviceSidebar.classList.toggle('is-stuck', e.intersectionRatio < 1 && e.boundingClientRect.top < 120);
  }, { threshold: [1], rootMargin: '-100px 0px 0px 0px' });
  sideObs.observe(serviceSidebar);
}

// Process steps — activar al hover (desktop)
document.querySelectorAll('.process-timeline .process-step').forEach(step => {
  step.addEventListener('mouseenter', () => {
    step.closest('.process-timeline')?.querySelectorAll('.process-step').forEach(s => s.classList.remove('is-active'));
    step.classList.add('is-active');
  });
});

// Hero — entrada por líneas
document.addEventListener('DOMContentLoaded', () => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    requestAnimationFrame(() => document.body.classList.add('hero-ready'));
  } else {
    document.body.classList.add('hero-ready');
  }
});

// Tarjetas de proyecto — tilt + glow
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const rotY = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const rotX = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
    card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// Process timeline — línea y pasos al scroll
const processTimeline = document.getElementById('processTimeline');
if (processTimeline) {
  const processSteps = processTimeline.querySelectorAll('.process-step');
  const updateProcessProgress = () => {
    const rect = processTimeline.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.85;
    const end = vh * 0.25;
    const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height * 0.5)));
    processTimeline.style.setProperty('--process-progress', String(progress));
    const litCount = Math.ceil(progress * processSteps.length);
    processSteps.forEach((step, i) => step.classList.toggle('is-lit', i < litCount));
    processTimeline.classList.toggle('is-in-view', rect.top < vh && rect.bottom > 0);
  };
  updateProcessProgress();
  let processTicking = false;
  window.addEventListener('scroll', () => {
    if (processTicking) return;
    processTicking = true;
    requestAnimationFrame(() => {
      updateProcessProgress();
      processTicking = false;
    });
  }, { passive: true });
}

// Mini demo n8n — flujos orientativos por sector
const FLOW_TEMPLATES = {
  retail: {
    title: 'Negocio local — captación y reservas',
    metric: 'Resultado típico: <strong>+ visibilidad y leads desde Maps</strong>',
    nodes: [
      { type: 'Trigger', title: 'Google Maps / web' },
      { type: 'IA', title: 'Clasifica consulta' },
      { type: 'CRM', title: 'Ficha cliente' },
      { type: 'WhatsApp', title: 'Respuesta rápida' },
      { type: 'Recordatorio', title: 'Seguimiento' }
    ]
  },
  coaching: {
    title: 'Coach / servicios profesionales',
    metric: 'Resultado típico: <strong>+ tráfico orgánico y leads cualificados</strong>',
    nodes: [
      { type: 'Trigger', title: 'Formulario / blog' },
      { type: 'IA', title: 'Resume necesidad' },
      { type: 'CRM', title: 'Pipeline ventas' },
      { type: 'Email', title: 'Secuencia nurturing' },
      { type: 'Calendario', title: 'Cita propuesta' }
    ]
  },
  ecommerce: {
    title: 'E-commerce y artesanía online',
    metric: 'Resultado típico: <strong>pedidos y clientes fuera de la zona local</strong>',
    nodes: [
      { type: 'Trigger', title: 'Pedido / carrito' },
      { type: 'IA', title: 'Soporte básico' },
      { type: 'CRM', title: 'Historial compra' },
      { type: 'Email', title: 'Post-venta' },
      { type: 'Social', title: 'Contenido auto' }
    ]
  },
  b2b: {
    title: 'Servicios B2B y equipos comerciales',
    metric: 'Resultado típico: <strong>-70% tiempo manual en seguimiento</strong>',
    nodes: [
      { type: 'Trigger', title: 'Lead entrante' },
      { type: 'IA', title: 'Scoring lead' },
      { type: 'CRM', title: 'Asignación' },
      { type: 'Email', title: 'Propuesta base' },
      { type: 'Informe', title: 'KPIs semanales' }
    ]
  }
};

function renderN8nFlow(sector) {
  const canvas = document.getElementById('n8nCanvasInner');
  const titleEl = document.getElementById('flowDemoTitle');
  const metricEl = document.getElementById('flowDemoMetric');
  if (!canvas || !FLOW_TEMPLATES[sector]) return;

  const tpl = FLOW_TEMPLATES[sector];
  if (titleEl) titleEl.textContent = tpl.title;
  if (metricEl) metricEl.innerHTML = tpl.metric;

  canvas.innerHTML = '';
  tpl.nodes.forEach((node, i) => {
    if (i > 0) {
      const conn = document.createElement('span');
      conn.className = 'n8n-connector';
      conn.setAttribute('aria-hidden', 'true');
      canvas.appendChild(conn);
    }
    const el = document.createElement('div');
    el.className = 'n8n-node';
    el.innerHTML = `<div class="n8n-node-type">${node.type}</div><div class="n8n-node-title">${node.title}</div>`;
    canvas.appendChild(el);
  });
}

let n8nAnimTimer = null;
function runN8nAnimation() {
  const canvas = document.getElementById('n8nCanvasInner');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas?.querySelectorAll('.n8n-node').forEach(n => n.classList.add('is-active'));
    return;
  }
  if (n8nAnimTimer) clearInterval(n8nAnimTimer);
  const nodes = canvas.querySelectorAll('.n8n-node');
  const connectors = canvas.querySelectorAll('.n8n-connector');
  let step = 0;
  const tick = () => {
    nodes.forEach((n, i) => n.classList.toggle('is-active', i === step));
    connectors.forEach((c, i) => c.classList.toggle('is-active', i === step));
    step = (step + 1) % (nodes.length + 1);
  };
  tick();
  n8nAnimTimer = setInterval(tick, 1100);
}

function initFlowDemo() {
  const wrap = document.getElementById('flowDemo');
  if (!wrap) return;

  let currentSector = 'retail';
  renderN8nFlow(currentSector);
  runN8nAnimation();

  wrap.querySelectorAll('.flow-demo-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const sector = tab.dataset.sector;
      if (!sector || sector === currentSector) return;
      currentSector = sector;
      wrap.querySelectorAll('.flow-demo-tab').forEach(t => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      renderN8nFlow(sector);
      runN8nAnimation();
    });
  });

  const demoObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) runN8nAnimation();
      else if (n8nAnimTimer) clearInterval(n8nAnimTimer);
    });
  }, { threshold: 0.25 });
  demoObs.observe(wrap);
}

initFlowDemo();

function selectFlowSector(sector) {
  const tab = document.querySelector(`.flow-demo-tab[data-sector="${sector}"]`);
  if (tab) tab.click();
}

document.querySelectorAll('.sector-chip[data-sector]').forEach(chip => {
  const go = () => {
    const sector = chip.dataset.sector;
    const target = document.getElementById('automatizacion');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => selectFlowSector(sector), 400);
  };
  chip.addEventListener('click', go);
  chip.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      go();
    }
  });
});
