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
  document.querySelectorAll('a,button,.grid-card,.faq-item').forEach(el=>{
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
const observer = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
},{threshold:0.1});
document.querySelectorAll('.fade-up,.slide-left,.slide-right,.fade-scale').forEach(el=>observer.observe(el));

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
