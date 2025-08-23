
export function initCarousel(rootId, interval=4000){
  const root = document.getElementById(rootId);
  if(!root) return;
  const slides = Array.from(root.querySelectorAll('.slide'));
  if(!slides.length) return;
  let i = 0;
  const show = n => slides.forEach((s,k)=> s.style.display = (k===n)?'block':'none');
  show(0);
  const prev = root.querySelector('.ctrl.prev');
  const next = root.querySelector('.ctrl.next');
  if(prev) prev.onclick = ()=>{ i=(i-1+slides.length)%slides.length; show(i); };
  if(next) next.onclick = ()=>{ i=(i+1)%slides.length; show(i); };
  setInterval(()=>{ i=(i+1)%slides.length; show(i); }, interval);
}
