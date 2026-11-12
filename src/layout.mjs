import {blackFridayBanner} from './black-friday.mjs';

export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderPage({file, title, description, body, mainClass = '', css = [], scripts = [], assets, production = false, noindex = false}) {
  const links = [
    ['piscines.html', 'Piscines'], ['amenagements.html', 'Aménagements'],
    ['realisations.html', 'Réalisations'], ['serenite-garanties.html', 'Garanties & suivi'], ['contact.html', 'Contact']
  ];
  const nav = links.map(([href, label]) => `<a href="${href}"${file === href ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const base = production ? 'https://www.lc-creation.be/' : 'https://lc-creation-refonte-2027.sunset-robin-4751.chatgpt.site/';
  const canonical = base + (file === 'index.html' ? '' : file);
  const pageTitle = title.replace(/\s*\|\s*LC Création\s*$/,'') + ' | LC Création';
  const schema = { '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness', name: 'LC Création SRL', url: 'https://www.lc-creation.be/', telephone: '+32474693800', email: 'lecocqcedric@outlook.be', areaServed: [{ '@type': 'City', name: 'Grez-Doiceau' }, { '@type': 'AdministrativeArea', name: 'Brabant wallon' }], description: 'Piscines bois et béton, terrasses, terrassement et aménagements extérieurs.' };
  return `<!doctype html>
<html lang="fr-BE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080f1b">
<title>${escapeHtml(pageTitle)}</title><meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${production && !noindex ? 'index,follow' : 'noindex,nofollow'}"><link rel="canonical" href="${canonical}">
<meta property="og:title" content="${escapeHtml(pageTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="fr_BE"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${base + assets.pool}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.png"><link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="assets/pages.css">${css.map(path=>`<link rel="stylesheet" href="${path}">`).join('')}<link rel="stylesheet" href="assets/luxury.css">
${production ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}
<script src="assets/black-friday.js" defer></script><script src="assets/site.js" defer></script>${scripts.map(path=>`<script src="${path}" defer></script>`).join('')}
</head><body data-page="${file}"${!production ? ' data-preview="true"' : ''}>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<div class="preview-note"${production ? ' hidden' : ''}>Version de présentation <span>•</span> Les demandes ne sont pas envoyées.</div>
<header class="site-header"><div class="header-inner"><a class="brand" href="index.html" aria-label="LC Création — Accueil"><img src="${assets.logo}" width="1200" height="486" alt="LC Création — Piscines & aménagements extérieurs"></a><nav class="site-nav" id="navigation" aria-label="Navigation principale">${nav}<a class="btn btn-primary nav-mobile-cta" href="configurer.html">Configurer mon projet <span aria-hidden="true">↗</span></a></nav><a class="btn btn-primary header-cta" href="configurer.html">Configurer mon projet <span aria-hidden="true">↗</span></a><button class="menu-toggle" type="button" aria-controls="navigation" aria-expanded="false"><span class="menu-label">Menu</span><span class="menu-icon" aria-hidden="true"><i></i><i></i></span></button></div></header>
${file === 'politique-confidentialite.html' || file.startsWith('merci-') ? '' : blackFridayBanner}
<main id="contenu"${mainClass ? ` class="${mainClass}"` : ''}>${body}</main>
<footer class="site-footer"><div class="container"><div class="footer-top"><div class="footer-brand"><a href="index.html"><img src="${assets.logo}" width="1200" height="486" alt="LC Création SRL"></a><p>Votre piscine. Votre extérieur.<br>Un seul interlocuteur.</p><span>Grez-Doiceau · Brabant wallon</span></div><div><h2>Votre projet</h2><a href="piscine-bois-25900.html">LC 6.3 — 25 900 € TVAC</a><a href="piscine-bali.html">La collection Bali</a><a href="piscine-beton.html">Piscine béton sur mesure</a><a href="amenagements.html">Aménagements extérieurs</a><a href="configurer.html">Configurer mon projet</a></div><div><h2>Notre savoir-faire</h2><a href="realisations.html">Nos réalisations</a><a href="piscines.html#etapes">Le chantier en images</a><a href="serenite-garanties.html">Garanties & Pack Sérénité</a><a href="https://www.google.com/maps?cid=13558427197998517110" target="_blank" rel="noopener">Nos avis Google ↗</a></div><div class="footer-contact"><h2>Parlons de votre terrain</h2><a class="footer-phone" href="tel:+32474693800">0474 / 69 38 00</a><a href="mailto:lecocqcedric@outlook.be">lecocqcedric@outlook.be</a><p>Piscine, terrasse ou jardin complet :<br>présentez-nous votre projet.</p><a href="contact.html" class="link-arrow">Nous contacter <span aria-hidden="true">↗</span></a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} LC Création SRL</span><span>Piscines & aménagements extérieurs</span><a href="politique-confidentialite.html">Confidentialité</a></div></div></footer>
<div class="mobile-action-bar"><a href="tel:+32474693800" aria-label="Appeler LC Création"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a16 16 0 0 1-7-7l2-2-2-5Z"/></svg><span>Appeler</span></a><a class="btn btn-primary" href="configurer.html">Configurer mon projet <span aria-hidden="true">↗</span></a></div>
<dialog id="photo-dialog" class="photo-dialog" aria-label="Photographie agrandie"><button type="button" class="dialog-close" aria-label="Fermer la photographie">×</button><figure><img alt=""><figcaption></figcaption></figure></dialog>
</body></html>`;
}

export function closeSection({title = 'Votre prochain été commence ici.', text = 'Piscine, terrasse, jardin : parlons de l’ensemble de votre projet.', href = 'configurer.html', label = 'Configurer mon projet'} = {}) {
  return `<section class="section section-dark closing-section"><div class="container closing-grid"><div><p class="eyebrow">Préparons votre extérieur pour 2027</p><h2>${title}</h2><p>${text}</p></div><a class="btn btn-primary btn-large" href="${href}">${label}<span aria-hidden="true">↗</span></a></div></section>`;
}
