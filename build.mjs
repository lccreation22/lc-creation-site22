import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderPage} from './src/layout.mjs';
import createHome from './src/home.mjs';
import createPages from './src/pages.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes('--production');
const read = file => fs.readFile(path.join(root, file), 'utf8');
const A = JSON.parse(await read('dist/assets/manifest.json'));
const pages = {'index.html': createHome(A), ...createPages(A)};
const commonScripts = ['assets/lc-tracking-production.js'];
const forms = 'src/forms/';
const commonFormScripts = [...commonScripts, 'assets/forms-runtime.js'];

function unwrapMain(html) {
  const match = html.trim().match(/^<main\b([^>]*)>([\s\S]*)<\/main>\s*$/i);
  if (!match) throw new Error('Expected exactly one outer main element in form fragment');
  return {body: match[2], mainClass: match[1].match(/class="([^"]+)"/)?.[1] || ''};
}
pages['configurateur-projet.html'] = {
  title: 'Configurer ma piscine et mon aménagement extérieur',
  description: 'Configurez votre LC 6.3 à 25 900 € TVAC, volet PVC manuel et pompe à chaleur inclus, ou votre piscine béton. Terrasse et jardin sur étude.',
  ...unwrapMain(await read(forms + 'configurateur-projet.fragment.html')),
  css: ['assets/forms.css', 'assets/lc-tracking.css'],
  scripts: [...commonFormScripts, 'assets/configurateur-projet.js']
};
pages['configurateur-piscine.html'] = {
  title: 'Configurer les formats bois et packs piscine',
  description: 'Composez votre piscine bois, son pack, ses options et ses aménagements. Estimation indicative et récapitulatif complet.',
  ...unwrapMain(await read(forms + 'configurateur-piscine.fragment.html')),
  css: ['assets/forms.css', 'assets/lc-tracking.css'],
  scripts: [...commonFormScripts, 'assets/pool-pricing.js', 'assets/configurateur-piscine.js']
};
// The surrounding page already owns the destination id="formulaire".
const baliForm = (await read(forms + 'bali-form.fragment.html')).replace('id="formulaire"', 'id="bali-form-section"');
pages['piscine-bali.html'].body = pages['piscine-bali.html'].body.replace('<!--BALI_FORM-->', baliForm);
pages['piscine-bali.html'].css = ['assets/forms.css', 'assets/lc-tracking.css'];
pages['piscine-bali.html'].scripts = [...commonFormScripts, 'assets/bali-form.js'];

const privacySource = await read('src/privacy.fragment.html');
pages['politique-confidentialite.html'] = {
  title: 'Politique de confidentialité',
  description: 'Utilisation des données de votre projet, mesure des visites, choix des cookies et contact LC Création.',
  body: '<section class="section"><div class="container legal-content">' + privacySource + '</div></section>'
};
for (const [file, offer] of [['merci-configurateur.html', 'piscine'], ['merci-bali.html', 'Bali']]) {
  pages[file] = {
    title: 'Votre projet ' + offer,
    description: 'La suite de votre projet avec LC Création.',
    noindex: true,
    body: `<section class="section section-cream"><div class="container legal-content"><p class="eyebrow">Votre projet LC Création</p><h1>${production ? 'Merci pour votre demande.' : 'La suite de votre projet.'}</h1><p class="intro">${production ? 'Votre demande sera étudiée pour préciser la faisabilité, les équipements et les aménagements souhaités.' : 'Dans cette présentation, les formulaires affichent un récapitulatif local et ne transmettent aucune demande.'}</p><p>Pensez aux accès au terrain, aux niveaux, à votre terrasse et à l’ensemble des espaces que vous souhaitez nous confier.</p><div class="lc-actions"><a class="btn btn-primary" href="realisations.html">Découvrir nos réalisations ↗</a><a class="btn btn-outline" href="contact.html">Contacter LC Création</a></div></div></section>`
  };
}
// Preserve an existing landing URL without silently discarding its visitors.
pages['piscine-urbaine.html'] = {
  title: 'Une piscine adaptée à votre espace',
  description: 'Étudiez une piscine et des aménagements adaptés à votre jardin avec LC Création.',
  noindex: true,
  body: '<section class="section section-cream"><div class="container legal-content"><p class="eyebrow">Votre espace extérieur</p><h1>Chaque jardin a son projet.</h1><p class="intro">Le choix du bassin commence par la place disponible, les accès et la façon dont vous souhaitez vivre votre jardin.</p><p>Découvrez les formats de piscines bois, l’offre LC 6.3 et les possibilités en béton sur mesure.</p><div class="lc-actions"><a class="btn btn-primary" href="configurer.html">Choisir mon projet ↗</a><a class="btn btn-outline" href="contact.html">Parlons de mon terrain</a></div></div></section>'
};

await fs.mkdir(path.join(root, 'dist/assets'), {recursive:true});
for (const name of ['site.css', 'pages.css', 'luxury.css', 'site.js']) await fs.copyFile(path.join(root, 'src', name), path.join(root, 'dist/assets', name));
for (const name of await fs.readdir(path.join(root, forms))) {
  if (/\.(css|js)$/.test(name)) await fs.copyFile(path.join(root, forms, name), path.join(root, 'dist/assets', name));
}
for (const [file, page] of Object.entries(pages)) {
  const css = [...new Set(['assets/lc-tracking.css', ...(page.css || [])])];
  const scripts = page.scripts || commonScripts;
  const html = renderPage({...page, file, css, scripts, assets:A, production}).replaceAll('<br>', '<br> ').replaceAll('↗', '<svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>');
  await fs.writeFile(path.join(root, 'dist', file), html);
}
const indexable = Object.keys(pages).filter(file => !pages[file].noindex && !file.startsWith('configurateur-') && file !== 'politique-confidentialite.html');
await fs.writeFile(path.join(root, 'dist/sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + indexable.map(file => '<url><loc>https://www.lc-creation.be/' + (file === 'index.html' ? '' : file) + '</loc></url>').join('') + '</urlset>\n');
await fs.writeFile(path.join(root, 'dist/robots.txt'), production ? 'User-agent: *\nAllow: /\nSitemap: https://www.lc-creation.be/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n');
console.log(`Built ${Object.keys(pages).length} pages in ${production ? 'LC production' : 'private presentation'} mode.`);
