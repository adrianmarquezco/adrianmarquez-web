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
if (mobileBtn && navLinks) {
  mobileBtn.addEventListener('click',()=>{
    const open = navLinks.classList.toggle('open');
    document.body.classList.toggle('nav-open', open);
    mobileBtn.innerHTML = open ? '&#10005;' : '&#9776;';
  });
  navLinks.querySelectorAll('a:not(.has-dropdown > a)').forEach(a=>{
    a.addEventListener('click',()=>{
      navLinks.classList.remove('open');
      document.body.classList.remove('nav-open');
      mobileBtn.innerHTML = '&#9776;';
    });
  });
  navLinks.querySelectorAll('.has-dropdown > a').forEach(a=>{
    a.addEventListener('click',e=>{
      if(window.innerWidth<=900){
        e.preventDefault();
        a.closest('.has-dropdown').classList.toggle('dd-open');
      }
    });
  });
}

// FADE UP
const observer = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
},{threshold:0.12});
document.querySelectorAll('.fade-up').forEach(el=>observer.observe(el));

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
