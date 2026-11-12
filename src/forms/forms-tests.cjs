'use strict';
// Local-only regression checks. Every transport is a stub; no production request is sent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
// Load the browser/UMD source independently of the production package's ESM mode.
const pricingModule = { exports: {} };
vm.runInNewContext(source('pool-pricing.js'), { module: pricingModule }, { filename: 'pool-pricing.js' });
const pricing = pricingModule.exports;
let checks = 0;
function check(description, fn) { fn(); checks++; process.stdout.write('OK ' + description + '\n'); }
const base = { taille: 'Compacte', pack: 'Essentiel', pose: 'Hors-sol', liner: 'Blue', chauffage: 'Pas de chauffage', traitement: 'Traitement manuel', entretien: 'Sans robot', loisirs: [], evacuation: 'Non', evacuationM3: 0, terrasseMateriau: 'Aucune', terrasseM2: 0, serenite: false };
const calc = changes => pricing.calculate({ ...base, ...changes });
check('9 prix historiques de base conservés', () => {
  [['Compacte',15990,23290,28290],['Familiale',18990,26990,31990],['Grande',21990,30990,36990]].forEach(([taille,...values]) => ['Essentiel','Confort','Luxe'].forEach((pack,i) => assert.equal(calc({taille,pack}).total,values[i])));
});
check('liners Sand et Grey ajoutent exactement 175 € avant arrondi', () => {
  for (const liner of ['Sand','Grey']) assert.equal(calc({liner}).total - calc({}).total,175);
  assert.equal(pricing.LINER_SURCHARGE,175);
  assert.equal(calc({liner:'Sand'}).rounded,16165); // Arrondi à l’euro : le total affiché reflète aussi le supplément exact de 175 €.
});
check('électrolyseur réellement sélectionnable ajoute 1 800 €', () => assert.equal(calc({traitement:'Électrolyseur sel'}).total,17790));
check('options incluses Luxe sans double facturation', () => {
  assert.equal(calc({pack:'Luxe',chauffage:'Pompe à chaleur',entretien:'Avec robot nettoyeur',traitement:'Pompe doseuse',loisirs:['Spot LED couleur (RGB)'],serenite:true}).total,28290);
  assert.equal(calc({pack:'Luxe',serenite:true}).annual,0);
  assert.equal(calc({pack:'Luxe'}).sereniteIncluded,true);
});
check('Sérénité 399 €/an reste séparé du montant du chantier', () => {
  assert.equal(calc({serenite:true}).total,15990); assert.equal(calc({serenite:true}).annual,399);
});
check('pose, évacuation et terrasse entrent dans le calcul', () => {
  const result=calc({taille:'Familiale',pose:'Enterrée',evacuation:'Oui',evacuationM3:38,terrasseMateriau:'Composite',terrasseM2:30});
  assert.ok(Math.abs(result.total-(18990*1.2+38*96.8+30*190))<0.001);
  assert.equal(pricing.defaultEvacuation('Familiale','Enterrée'),38);
  assert.equal(pricing.defaultTerrace('Compacte'),20.4);
});
check('Halo reste un chiffrage séparé ; valeurs négatives non facturées', () => {
  assert.equal(calc({loisirs:['Bandeau LED sous margelles (Halo)']}).total,15990);
  assert.equal(calc({terrasseMateriau:'Bois',terrasseM2:-1,evacuation:'Oui',evacuationM3:-2}).total,15990);
});
check('aucune double bascule des cases, aucun fbq direct dans les formulaires', () => {
  for(const file of ['configurateur-piscine.js','configurateur-projet.js','bali-form.js']) {
    const js=source(file);assert.ok(!/checked\s*=\s*!/.test(js));assert.ok(!/\bfbq\s*\(/.test(js));assert.ok(!/\bfetch\s*\(/.test(js));
  }
});
check('champs bois supplémentaires présents en payload et synthèse', () => {
  const js=source('configurateur-piscine.js');
  for(const field of ['pose','linerColor','evacuation','evacuationM3','terrasseMateriau','terrasseM2','serenite','sereniteAnnuel','configurationDetails']) assert.ok(new RegExp('\\b'+field+'\\s*:').test(js),field);
  for(const id of ['summary-pose','summary-liner','summary-evac','summary-plage','summary-serenite']) assert.ok(js.includes(id));
  assert.ok(js.includes("'DÉTAILS DE LA CONFIGURATION\\n' + additions.join"));
});
function node() {
  return {textContent:'',children:[],attrs:{},disabled:false,className:'',style:{},checked:false,value:'',hidden:false,
    replaceChildren(){this.children=[];this.textContent='';},appendChild(child){this.children.push(child);},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;},
    classList:{toggle(){}},addEventListener(){},closest(){return {classList:{toggle(){}}};}
  };
}
function runtime(host,response={ok:true,id:'stub-id'},httpOK=true) {
  const calls={fetch:0,prepare:0,complete:0,redirect:0}, button=node(),status=node(); button.textContent='Envoyer';
  const w={location:{hostname:host},sessionStorage:{setItem(){}},LCTracking:{prepare(){calls.prepare++;return {};},complete(){calls.complete++;}},
    fetch:async()=>{calls.fetch++;return {ok:httpOK,json:async()=>response};},setTimeout(){calls.redirect++;}};
  vm.runInNewContext(source('forms-runtime.js'),{window:w,document:{createElement:node},WeakSet,Date});
  return {api:w.LCForms,calls,button,status};
}
function formHarness(file,prefix,initial,hash,search) {
  const elements={},listeners={},selection=[{value:'Pompe à chaleur'},{value:'Plantations et aménagement paysager'}];
  const form={addEventListener(name,fn){listeners[name]=fn;},querySelectorAll(selector){return selector.includes(':checked')?selection:[];}};
  for(const [id,value] of Object.entries(initial)){elements[prefix+id]=node();elements[prefix+id].value=String(value);}
  const other=['lc63-details','concrete-details','concrete-dimensions'];for(const id of other)elements[id]=node();
  elements[file==='bali-form.js'?'bali-form':'lc-project-form']=form;
  const capture=[];
  const w={location:{hash,search},LCForms:{bindValidation(){},valid(){return true;},money:x=>x+' €',send:async(payload,options)=>{capture.push({payload,options});}}};
  vm.runInNewContext(source(file),{window:w,document:{getElementById(id){assert.ok(elements[id],'Missing test node '+id);return elements[id];}},URLSearchParams,Array,Number});
  return {elements,listeners,capture};
}
(async()=>{
  for(const host of ['preview.chatgpt-team.site','localhost','lc-creation.be.evil.test','www.lc-creation.be.preview.test']) {
    const r=runtime(host);await r.api.send({estimationText:'25 900 €'},{button:r.button,status:r.status,successUrl:'/merci.html',rows:[['Projet','Test local']]});
    check('preview isolée : '+host,()=>{assert.deepEqual(r.calls,{fetch:0,prepare:0,complete:0,redirect:0});assert.equal(r.status.textContent,'Prévisualisation : demande non envoyée.');assert.equal(r.button.disabled,false);});
  }
  for(const host of ['lc-creation.be','www.lc-creation.be']) {
    const r=runtime(host);const opts={button:r.button,status:r.status,requireId:true};
    await r.api.send({},opts);await r.api.send({},opts);
    check('succès confirmé dédupliqué avec transport simulé : '+host,()=>assert.deepEqual(r.calls,{fetch:1,prepare:1,complete:1,redirect:0}));
  }
  for(const [response,httpOK] of [[{ok:true,skipped:true},true],[{ok:false},true],[{ok:true},true],[{ok:true,id:'stub'},false]]) {
    const r=runtime('lc-creation.be',response,httpOK);await r.api.send({},{button:r.button,status:r.status,requireId:true});
    check('pas de conversion sur réponse invalide '+JSON.stringify(response)+' HTTP='+httpOK,()=>{assert.equal(r.calls.complete,0);assert.equal(r.button.disabled,false);assert.ok(r.status.textContent.includes('n’a pas été confirmé'));});
  }
  const projectInitial={offer:'',pac:'Pompe à chaleur','pac-help':'',serenite:'','serenite-help':'',submit:'',status:'','summary-offer':'','summary-equipment':'','summary-scope':'','summary-options':'','summary-price':'','summary-serenite':'',scope:'Piscine seule',budget:38000,timing:'Dans les 6 à 12 mois',first:'Test',last:'Local',email:'test@example.invalid',phone:'0000000000',postal:'1400',terrain:'Plat',length:8,width:4,message:'Terrasse à intégrer',website:''};
  const project=formHarness('configurateur-projet.js','project-',projectInitial,'#lc-6-3','?scope=complete&serenite=1');
  await project.listeners.submit({preventDefault(){}});
  check('payload LC6.3 : PAC et volet PVC manuel inclus, 25 900 €, portée complète et Sérénité',()=>{
    const p=project.capture[0].payload;
    assert.equal(p.estimationText,'25 900 €');assert.equal(p.chauffageTxt,'Pompe à chaleur incluse');assert.equal(p.couvertureTxt,'Volet PVC manuel inclus');
    assert.equal(p.projectScope,'Piscine + aménagement complet');assert.equal(p.serenite,true);assert.equal(p.sereniteAnnuel,399);
    assert.ok(!p.selectedOptions.includes('Pompe à chaleur'));assert.ok(p.includedEquipment.includes('Pompe à chaleur'));
    assert.ok(p.message.includes('volet PVC manuel et pompe à chaleur inclus'));assert.ok(p.message.includes('399 €/an'));
    for(const k of ['source','projet','poolType','prenom','nom','emailClient','tel','codePostal','terrain','typeProjet','pack','taille','length','width','budgetAmount','budgetText','delaiTxt','chauffageTxt','couvertureTxt','estimationText','message','website']) assert.ok(k in p,k);
  });
  project.elements['project-offer'].value='concrete';project.listeners.change();await project.listeners.submit({preventDefault(){}});
  check('payload béton : dimensions personnalisées et pas de prix inventé',()=>{
    const p=project.capture[1].payload;assert.equal(p.poolType,'concrete');assert.equal(p.length,8);assert.equal(p.width,4);assert.ok(p.estimationText.includes('aucun prix calculé'));assert.equal(p.includedEquipment.length,0);
  });
  const baliInitial={scope:'Piscine seule',serenite:'',nom:'Local',prenom:'Test',email:'test@example.invalid',telephone:'0000000000',adresse:'1 rue test','code-postal':'1400',ville:'Test',distance:'Moins de 30 min',budget:'Je confirme un budget cohérent (+30k)',disponibilite:'Date à définir',terrain:'Plat',engagement:'Projet concret',message:'Jardin complet',submit:'',status:''};
  const bali=formHarness('bali-form.js','bali-',baliInitial,'#formulaire','?scope=complete&serenite=1');bali.elements['bali-budget'].selectedOptions=[{textContent:'À partir de 30 000 €'}];
  await bali.listeners.submit({preventDefault(){}});
  check('payload Bali conserve le contrat et accepte une date à définir',()=>{
    const p=bali.capture[0].payload;assert.equal(p.delaiTxt,'Date à définir');assert.equal(p.sereniteAnnuel,399);assert.equal(p.projectScope,'Piscine + aménagement complet');
    for(const k of ['source','projet','prenom','nom','emailClient','tel','adresse','codePostal','ville','distance','budgetText','delaiTxt','terrain','engagement','message','estimationText','pack','taille']) assert.ok(k in p,k);
  });
  check('tracking totalement inactif sur preview et paramètres reconnus conservés',()=>{
    const w={location:{hostname:'preview.chatgpt-team.site'}};
    vm.runInNewContext(source('lc-tracking-production.js'),{window:w,document:{}});
    assert.equal(w.LCTracking,undefined);
    const js=source('lc-tracking-production.js');assert.ok(js.includes("cleanSearch.set('serenite', '1')"));assert.ok(js.includes("cleanSearch.set('scope', search.get('scope'))"));
  });
  process.stdout.write('\n'+checks+' groupes de vérifications réussis. Aucun appel réseau réel.\n');
})().catch(err=>{process.stderr.write(err.stack+'\n');process.exitCode=1;});
