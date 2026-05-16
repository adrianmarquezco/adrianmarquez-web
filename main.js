// CURSOR
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
if (cursor && ring) {
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
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
