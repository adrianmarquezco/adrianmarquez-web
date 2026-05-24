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
const navNextSibling = navLinks ? navLinks.nextSibling : null;

function openMobileNav() {
  // Move nav-links to body to escape nav's stacking context
  document.body.appendChild(navLinks);
  // Use innerHeight to cover full viewport including browser chrome
  navLinks.style.height = window.innerHeight + 'px';
  navLinks.classList.add('open');
  document.body.classList.add('nav-open');
  mobileBtn.classList.add('is-open');
  mobileBtn.innerHTML = '&#10005;';
  // Move close button into the overlay so it's above it in z-index
  navLinks.appendChild(mobileBtn);
}

function closeMobileNav() {
  // Move button back to nav before moving nav-links
  if (navParent) navParent.appendChild(mobileBtn);
  navLinks.classList.remove('open');
  navLinks.style.height = '';
  document.body.classList.remove('nav-open');
  mobileBtn.classList.remove('is-open');
  mobileBtn.innerHTML = '&#9776;';
  // Move nav-links back inside nav
  if (navParent) navParent.insertBefore(navLinks, mobileBtn);
}

if (mobileBtn && navLinks) {
  mobileBtn.addEventListener('click',()=>{
    navLinks.classList.contains('open') ? closeMobileNav() : openMobileNav();
  });
  navLinks.addEventListener('click', e=>{
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

// COOKIE BANNER
document.addEventListener('DOMContentLoaded',function(){
  if(localStorage.getItem('cookie_consent')) return;
  const banner = document.getElementById('cookieBanner');
  if(!banner) return;
  setTimeout(()=>banner.classList.add('show'), 800);
  document.getElementById('cookieAccept').addEventListener('click',()=>{
    localStorage.setItem('cookie_consent','accepted');
    banner.classList.remove('show');
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

// HERO — parallax suave
const heroParallax = document.querySelector('[data-hero-parallax]');
if (heroParallax && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight * 1.1) {
      heroParallax.style.transform = `translate3d(0, ${y * 0.14}px, 0) scale(1.06)`;
    }
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
