// Contract test only: the real handler runs with fake environment values and a
// fetch stub. No email, advertising event or other network request is sent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
const formRoot = new URL('../src/forms/', import.meta.url);
const source = name => fs.readFileSync(new URL(name, formRoot), 'utf8');
const denyNetwork = () => { throw Error('Network is forbidden in this test'); };
http.request = http.get = https.request = https.get = denyNetwork;
process.env.RESEND_API = 'local-test-only';
process.env.RESEND_FROM = 'Test <sender@example.invalid>';
process.env.RESEND_TO = 'receiver@example.invalid';
let outgoing = [], accepted = true;
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(options.method, 'POST');
  outgoing.push(JSON.parse(options.body));
  return { ok: accepted, json: async () => accepted ? { id: 'local-mocked-email-id' } : { message: 'mock rejection' } };
};
const { default: handler } = await import('../api/send-piscine-lead.js');
function node() {
  return { textContent:'', value:'', checked:false, disabled:false, hidden:false,
    classList:{toggle(){}},addEventListener(){},closest(){return {classList:{toggle(){}}};} };
}
function harness(file,prefix,initial,hash,search) {
  const elements={}, listeners={}, capture=[];
  const form={addEventListener(name,fn){listeners[name]=fn;},querySelectorAll(selector){return selector.includes(':checked') ? [{value:'Plantations et aménagement paysager'}] : [];}};
  for(const [id,value] of Object.entries(initial)){elements[prefix+id]=node();elements[prefix+id].value=String(value);}
  for(const id of ['lc63-details','concrete-details','concrete-dimensions'])elements[id]=node();
  elements[file==='bali-form.js'?'bali-form':'lc-project-form']=form;
  const window={location:{hash,search},LCForms:{bindValidation(){},valid(){return true;},money:x=>x+' €',send:async payload=>capture.push(payload)}};
  vm.runInNewContext(source(file),{window,document:{getElementById(id){assert.ok(elements[id],id);return elements[id];}},URLSearchParams,Array,Number});
  return {elements,listeners,capture};
}
const longMessage='M'.repeat(3000);
const projectInitial={offer:'',pac:'Pompe à chaleur','pac-help':'',serenite:'','serenite-help':'',submit:'',status:'','summary-offer':'','summary-equipment':'','summary-scope':'','summary-options':'','summary-price':'','summary-serenite':'',scope:'Piscine seule',budget:38000,timing:'Dans les 6 à 12 mois',first:'Test',last:'Local',email:'test@example.invalid',phone:'0474000001',postal:'1400',terrain:'Plat',length:8,width:4,message:longMessage,website:''};
const project=harness('configurateur-projet.js','project-',projectInitial,'#lc-6-3','?scope=complete&serenite=1');
await project.listeners.submit({preventDefault(){}});
project.elements['project-offer'].value='concrete';project.listeners.change();
await project.listeners.submit({preventDefault(){}});
const baliInitial={scope:'Piscine seule',serenite:'',nom:'Local',prenom:'Test',email:'test@example.invalid',telephone:'0474000001',adresse:'1 rue test','code-postal':'1400',ville:'Test',distance:'Moins de 30 min',budget:'Je confirme un budget cohérent (+30k)',disponibilite:'Été 2027 — à confirmer',terrain:'Plat',engagement:'Projet concret',message:longMessage,submit:'',status:''};
const bali=harness('bali-form.js','bali-',baliInitial,'#formulaire','?scope=complete&serenite=1');
bali.elements['bali-budget'].selectedOptions=[{textContent:'À partir de 30 000 €'}];
await bali.listeners.submit({preventDefault(){}});
bali.elements['bali-disponibilite'].value='Date à définir';
await bali.listeners.submit({preventDefault(){}});
const summaries={'summary-pose':'Pose : Enterrée','summary-liner':'Liner : Sand','summary-evac':'Évacuation : Oui, 38 m³','summary-plage':'Terrasse : Composite, 30 m²','summary-serenite':'Pack Sérénité : 399 €/an','summary-budget':'Budget : 30 000 à 40 000 €','summary-chauffage':'Pompe à chaleur','summary-traitement':'Électrolyseur sel','summary-couverture':'Couverture incluse','summary-entretien':'Robot','summary-loisir':'LED','summary-delai':'Dans les 6 à 12 mois','summary-contact-pref':'Téléphone','summary-price':'35 000 €'};
const woodFunction=source('configurateur-piscine.js').match(/  function buildPayload\(\) \{[\s\S]*?\n  \}\n(?=  form\.addEventListener)/)?.[0];
assert.ok(woodFunction, 'Cannot locate real wood buildPayload');
const woodContext={configuration:{typeProjet:'Piscine + réaménagement complet du jardin',taille:'Familiale',pack:'Confort',pose:'Enterrée',liner:'Sand',loisirs:[],evacuation:'Oui',evacuationM3:38,terrasseMateriau:'Composite',terrasseM2:30,serenite:true,codePostal:'1400',terrain:'Plat'},estimate:{sereniteIncluded:false,annual:399},pricing:{LINER_SURCHARGE:175},value:id=>({'config-prenom':'Test','config-nom':'Local','config-email':'test@example.invalid','config-tel':'0474000001','config-message':longMessage})[id],summaryText:id=>summaries[id]};
vm.runInNewContext(woodFunction+'\nresult=buildPayload();',woodContext);
const submissionId='lc-12345678-1234-4234-8234-123456789abc';
const tracking={schema_version:1,submission_id:submissionId,source_offer:'general_pool',attribution:{utm_source:'local_test',gclid:'local-test-click'},consent:{analytics:true,marketing:false}};
async function run(payload,method='POST') {
  const start=outgoing.length, result={};
  await handler({method,body:JSON.parse(JSON.stringify(payload))},{status(code){result.status=code;return this;},json(data){result.data=data;return this;}});
  result.emails=outgoing.slice(start);return result;
}
const cases=[['LC6.3',project.capture[0]],['Béton',project.capture[1]],['Bali 2027',bali.capture[0]],['Bali date à définir',bali.capture[1]],['Bois',woodContext.result]];
const results={};
for(const [label,payload] of cases){
  payload.tracking={...tracking,source_offer:label==='LC6.3'?'LC_6_3':label==='Béton'?'concrete':'general_pool'};
  assert.ok(payload.message.length>3000);
  const result=await run(payload);results[label]=result;
  assert.equal(result.status,200,label);assert.equal(result.data.ok,true,label);assert.equal(result.data.id,'local-mocked-email-id');
  assert.equal(result.emails.length,1);assert.equal(result.emails[0].bcc,'opportunite+695292@vertuoza.com');
  assert.ok(result.emails[0].text.includes(payload.message),'Message not preserved in '+label);
  assert.equal(result.data.tracking.event_id,submissionId);
  assert.ok(!result.emails[0].text.includes('local-test-click'),'Marketing attribution without consent');
  console.log('OK real handler: '+label+'; complete message and tracking retained');
}
assert.equal(results['LC6.3'].data.tracking.parameters.source_offer,'LC_6_3');
assert.equal(results['LC6.3'].data.tracking.qualified,true);
assert.ok(results['LC6.3'].emails[0].text.includes('Volet PVC manuel inclus'));
assert.ok(results['LC6.3'].emails[0].text.includes('Pompe à chaleur incluse'));
assert.equal(results['Béton'].data.tracking.parameters.qualification_status,'concrete_budget_review');
assert.ok(results['Béton'].emails[0].text.includes('8 × 4 m'));
assert.ok(results['Bali 2027'].emails[0].text.includes('Disponibilité : Été 2027 — à confirmer'));
assert.ok(results['Bali date à définir'].emails[0].text.includes('Disponibilité : Date à définir'));
const wood=results.Bois.emails[0].text;
assert.ok(wood.includes('Évacuation : Oui (38 m³)'), 'Historical evacChoice/evacM3 aliases missing: email contradicts selected options');
assert.ok(wood.includes('Plage/terrasse : Composite (30 m²)'), 'Historical plageMateriau/plageSurface aliases missing');
const trap=await run({...project.capture[0],website:'robot.invalid'});
assert.equal(trap.data.skipped,'honeypot');assert.equal(trap.emails.length,0);
const noPost=await run({},'GET');assert.equal(noPost.status,405);assert.equal(noPost.emails.length,0);
accepted=false;
const originalError=console.error;console.error=()=>{};
const failure=await run(project.capture[0]);console.error=originalError;
assert.equal(failure.status,500);assert.equal(failure.data.ok,false);assert.ok(!failure.data.id);
console.log('OK honeypot, method guard and delivery error contract. No real network calls.');
