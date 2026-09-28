(function(){
  var overlay=document.getElementById('lb-overlay');
  var lbImg=document.getElementById('lb-img');
  var closeBtn=document.getElementById('lb-close');
  function openLb(src,alt){lbImg.src=src;lbImg.alt=alt;overlay.classList.add('active');closeBtn.style.display='flex';document.body.style.overflow='hidden';}
  function closeLb(){overlay.classList.remove('active');closeBtn.style.display='none';document.body.style.overflow='';}
  closeBtn.style.display='none';
  document.querySelectorAll('.gallery-img').forEach(function(img){
    img.addEventListener('click',function(){openLb(img.src,img.alt);});
  });
  overlay.addEventListener('click',closeLb);
  closeBtn.addEventListener('click',closeLb);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeLb();});
  document.querySelectorAll('.mini-gallery').forEach(function(g){
    var track=g.querySelector('.mg-track'),prev=g.querySelector('.mg-prev'),next=g.querySelector('.mg-next');
    function step(){var it=track.querySelector('.mg-item');return it?it.getBoundingClientRect().width+16:track.clientWidth;}
    function update(){
      var max=track.scrollWidth-track.clientWidth;
      g.classList.toggle('no-scroll',max<=2);
      prev.disabled=track.scrollLeft<=2;
      next.disabled=track.scrollLeft>=max-2;
    }
    prev.addEventListener('click',function(){track.scrollBy({left:-step(),behavior:'smooth'});});
    next.addEventListener('click',function(){track.scrollBy({left:step(),behavior:'smooth'});});
    track.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    update();
  });
})();
