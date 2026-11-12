'use strict';
// Local regression checks only: no requests, email, advertising or tracking transport.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
let now = Date.parse('2026-11-12T12:00:00Z');
class Clock extends Date { static now() { return now; } }
const mod = {exports: {}};
vm.runInNewContext(read('black-friday.js'), {module: mod, Date: Clock, URL, URLSearchParams});
const bf = mod.exports;
let checks = 0;
function check(name, run) { run(); checks++; process.stdout.write('OK ' + name + '\n'); }
function node() { return {hidden: true, textContent: '', children: [], attrs: {}, disabled: false, appendChild(child) {this.children.push(child);}, replaceChildren() {this.children = [];this.textContent = '';}, setAttribute(k,v) {this.attrs[k]=v;}, focus() {}}; }
check('fin exacte au 1er décembre 00 h à Bruxelles', () => {
  assert.equal(bf.expiresAt, Date.parse('2026-11-30T23:00:00Z'));
  assert.equal(bf.isActive(bf.expiresAt - 1), true);
  assert.equal(bf.isActive(bf.expiresAt), false);
  assert.equal(bf.isActive(bf.expiresAt + 1), false);
});
check('avantage pour tous les parcours, montants habituels conservés et aucune double ligne', () => {
  for (const source of ['configurateur-projet', 'configurateur-piscine', 'bali']) {
    const payload = {source, estimationText:'25 900 €', pack:'Luxe', selectedOptions:['Pompe doseuse'], message:'Mon projet'};
    const result = bf.decorateSubmission(payload, [['Estimation', payload.estimationText]]);
    assert.equal(payload.promotion.value, 1600);
    assert.equal(payload.promotion.placementIncluded, true);
    assert.equal(payload.estimationText, '25 900 €');
    assert.equal(payload.pack, 'Luxe');
    assert.deepEqual(payload.selectedOptions, ['Pompe doseuse']);
    assert.match(payload.message, /déjà remis et non signés/);
    assert.match(payload.message, /ne constitue pas une signature/);
    assert.match(payload.message, /sur un équipement déjà prévu/);
    const repeated = bf.decorateSubmission(payload, result.rows);
    assert.equal(repeated.rows.filter(row => row[0] === 'Offre Black Friday').length, 1);
    assert.equal(payload.message.split('OFFRE BLACK FRIDAY 2026').length, 2);
    now = bf.expiresAt;
    const expired = bf.decorateSubmission(payload, repeated.rows);
    assert.equal(expired.promotion, null);
    assert.equal(payload.promotion, undefined);
    assert.equal(payload.message, 'Mon projet');
    assert.equal(expired.rows.length, 1);
    now = bf.expiresAt - 1000;
  }
});
check('navigation conserve offre, périmètre et Sérénité ; bascule automatique à expiration', () => {
  const active = node(), ended = node();
  const links = [{href:'https://www.lc-creation.be/configurateur-projet.html?serenite=1&scope=complete#lc-6-3'}];
  const timers = [], events = [];
  const w = {location: {search:'?offre=black-friday-2026', href:'https://www.lc-creation.be/configurer.html?offre=black-friday-2026', origin:'https://www.lc-creation.be'}, setTimeout(fn, delay){timers.push({fn, delay});return timers.length;}, clearTimeout(){}, addEventListener(){}, dispatchEvent(event){events.push(event);}, CustomEvent: class {constructor(type){this.type=type;}}};
  const d = {body:{dataset:{page:'configurer.html'}}, querySelectorAll(selector){return selector === '[data-bf-active]' ? [active] : selector === '[data-bf-ended]' ? [ended] : links;}, addEventListener(){}};
  now = bf.expiresAt - 1000;
  bf.mount(w,d);
  assert.equal(active.hidden,false);assert.equal(ended.hidden,true);
  let url = new URL(links[0].href,w.location.href);
  assert.equal(url.searchParams.get('offre'),'black-friday-2026');assert.equal(url.searchParams.get('serenite'),'1');assert.equal(url.searchParams.get('scope'),'complete');assert.equal(url.hash,'#lc-6-3');
  now = bf.expiresAt;timers[0].fn();
  assert.equal(active.hidden,true);assert.equal(ended.hidden,false);
  url = new URL(links[0].href,w.location.href);
  assert.equal(url.searchParams.get('offre'),null);assert.equal(url.searchParams.get('scope'),'complete');
  assert.equal(events[0].type,'lc:black-friday-change');
});
check('le nettoyage de tracking conserve le marqueur BF et retire les paramètres inconnus', () => {
  const location = new URL('https://www.lc-creation.be/configurateur-projet.html?offre=black-friday-2026&scope=complete&serenite=1&inconnu=remove#lc-6-3');
  const w = {location, localStorage:{getItem(){return null;}}, sessionStorage:{getItem(){return null;},removeItem(){}}};
  let clean;
  vm.runInNewContext(read('forms/lc-tracking-production.js'), {window:w,document:{readyState:'loading',addEventListener(){}},location,history:{replaceState(a,b,value){clean=value;}},URL,URLSearchParams,Date:Clock,Math});
  assert.ok(clean.includes('offre=black-friday-2026'));assert.ok(clean.includes('scope=complete'));assert.ok(clean.includes('serenite=1'));assert.ok(!clean.includes('inconnu'));
});
(async () => {
  for (const phase of ['active','expired']) {
    now = phase === 'active' ? bf.expiresAt - 1000 : bf.expiresAt;
    const button = node(), status = node(), captured = [];let complete = 0;
    const w = {location:{hostname:'lc-creation.be'},LCBlackFriday:bf,LCTracking:{prepare(){return {consent:{analytics:false,marketing:false}};},complete(){complete++;}},fetch:async (url,options)=>{captured.push({url,payload:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true,id:'local-stub'})};}};
    vm.runInNewContext(read('forms/forms-runtime.js'),{window:w,document:{createElement:node},Date:Clock,WeakSet});
    await w.LCForms.send({source:'configurateur-projet',message:'Mon projet',estimationText:'25 900 €'}, {button,status,requireId:true,rows:[]});
    check('transport et confirmation simulés : ' + phase, () => {
      assert.equal(captured.length,1);assert.equal(captured[0].url,'/api/send-piscine-lead');assert.equal(complete,1);
      assert.equal(!!captured[0].payload.promotion,phase === 'active');
      assert.equal(captured[0].payload.estimationText,'25 900 €');
      assert.equal(status.children.length,phase === 'active' ? 1 : 0);
      assert.equal(captured[0].payload.tracking.consent.marketing,false);
    });
  }
  process.stdout.write('\n' + checks + ' vérifications Black Friday réussies. Aucun appel réseau réel.\n');
})().catch(error => {process.stderr.write(error.stack + '\n');process.exitCode=1;});
