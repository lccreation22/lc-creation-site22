(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('navigation');
  const setMenu = open => { menu?.setAttribute('aria-expanded', String(open)); nav?.classList.toggle('is-open', open); document.body.classList.toggle('menu-is-open', open); };
  menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 1121px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
  document.querySelectorAll('[data-comparison]').forEach(el => {
    const input = el.querySelector('input[type="range"]');
    const update = () => el.style.setProperty('--split', `${input.value}%`);
    input?.addEventListener('input', update); update();
  });
  const dialog = document.getElementById('photo-dialog');
  document.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    if (!dialog) return;
    const source = button.matches('img') ? button : button.querySelector('img');
    if (!source) return;
    dialog.querySelector('img').src = source.src;
    dialog.querySelector('img').alt = source.alt;
    dialog.querySelector('figcaption').textContent = source.alt;
    dialog.showModal();
  }));
  dialog?.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  const query = new URLSearchParams(location.search);
  const serenity = query.get('serenite') === '1';
  const scope = ['pool','terrace','complete'].includes(query.get('scope')) ? query.get('scope') : null;
  if (serenity) document.querySelectorAll('[data-serenite-notice]').forEach(notice => { notice.hidden = false; });
  if (serenity || scope) document.querySelectorAll('a[href*="configurateur"],a[href*="configurer.html"],a[data-preserve-serenite],a[href*="piscine-bali.html#"]').forEach(a => {
    const url = new URL(a.href);
    if (url.origin !== location.origin) return;
    if (serenity) url.searchParams.set('serenite','1');
    if (scope && !url.searchParams.has('scope')) url.searchParams.set('scope',scope);
    a.href = url.pathname.split('/').pop() + url.search + url.hash;
  });
})();
