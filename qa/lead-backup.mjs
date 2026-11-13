import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import handler from '../api/send-piscine-lead.js';

process.env.RESEND_API = 'test';
process.env.RESEND_FROM = 'sender@example.invalid';
process.env.RESEND_TO = 'owner@example.invalid';
process.env.LEAD_BACKUP_URL = 'https://backup.example.invalid';
process.env.LEAD_BACKUP_KEY = 'test-only';
const id = 'lc-12345678-1234-4234-8234-123456789abc';
const base = { submission_id:id, prenom:'TEST TECHNIQUE', nom:'NE PAS TRAITER', emailClient:'test@example.invalid',
  message:'Projet de test', tracking:{schema_version:1,submission_id:id,consent:{analytics:false,marketing:false},attribution:{gclid:'do-not-store',utm_source:'do-not-store'}} };
let mailMode = 'ok', backupMode = 'ok', calls=[];
globalThis.fetch = async (url, options) => {
  calls.push({url,options,body:JSON.parse(options.body)});
  const mail = url === 'https://api.resend.com/emails';
  const mode = mail ? mailMode : backupMode;
  assert.ok(options.signal, 'Every transport has a bounded timeout');
  if(mode === 'throw') throw new Error('Timeout with secret content');
  return {ok:mode==='ok',status:mode==='ok'?200:503,json:async()=>mode==='ok'?{id:'email-test-id'}:{message:'rejected'},text:async()=>mode==='ok'?'Accepted':mode==='false-ack'?'OK':'Rejected'};
};
async function run(body=base){calls=[];let result={};await handler({method:'POST',body},{status(code){result.status=code;return this;},json(data){result.data=data;return this;}});return result;}
const originalError=console.error;console.error=()=>{};
try {
  for (const data of [{source:'configurateur-piscine',typeProjet:'Piscine bois'},{source:'configurateur-projet',poolType:'wood',pack:'LC 6.3'},{source:'configurateur-projet',poolType:'concrete'},{source:'page-bali',projet:'Piscine Bali',pack:'Bali'}]) {
    const result=await run({...base,...data});assert.equal(result.data.ok,true);assert.equal(result.data.backup_status,'queued');assert.equal(calls.length,2);
    const record=calls[1].body;assert.equal(record.submission_id,id);assert.equal(record.resend_id,'email-test-id');assert.ok(!record.configuration_json.includes('do-not-store'));
    assert.equal(record.subject,calls[0].body.subject);assert.equal(record.text,calls[0].body.text);assert.equal(calls[1].options.headers['x-make-apikey'],'test-only');
  }
  backupMode='throw';assert.equal((await run()).data.id,'email-test-id');
  mailMode='throw';backupMode='ok';let fallback=await run();assert.equal(fallback.data.ok,true);assert.equal(fallback.data.email_status,'failed');assert.equal(fallback.data.id,id);
  backupMode='throw';assert.equal((await run()).data.ok,false);
  backupMode='false-ack';assert.equal((await run()).data.ok,false);
  delete process.env.RESEND_API;backupMode='ok';assert.equal((await run()).data.ok,true);assert.equal(calls.length,1);
  delete process.env.LEAD_BACKUP_KEY;assert.equal((await run()).data.ok,false);
  assert.equal((await run({...base,website:'robot'})).data.skipped,'honeypot');assert.equal(calls.length,0);
} finally {console.error=originalError;}

// Exercise real browser retry behavior without network or a real browser.
const node=()=>({textContent:'',replaceChildren(){},setAttribute(){},focus(){},appendChild(){}});
let sent=[], success=false;
const w={location:{hostname:'www.lc-creation.be'},crypto:{randomUUID:()=>crypto.randomUUID()},fetch:async(_url,options)=>{sent.push(JSON.parse(options.body));return {ok:success,json:async()=>success?{ok:true,id, email_status:'failed',backup_status:'queued'}:{ok:false}};}};
vm.runInNewContext(fs.readFileSync(new URL('../src/forms/forms-runtime.js',import.meta.url),'utf8'),{window:w,document:{createElement:node}});
const options={button:node(),status:node(),requireId:true,successText:'Email envoyé'};
await w.LCForms.send({nom:'Test'},options);await w.LCForms.send({nom:'Test'},options);assert.equal(sent[0].submission_id,sent[1].submission_id);
success=true;await w.LCForms.send({nom:'Corrigé'},options);assert.notEqual(sent[1].submission_id,sent[2].submission_id);assert.equal(options.button.textContent,'Demande enregistrée');assert.ok(!options.status.textContent.includes('Email envoyé'));
console.log('OK: four form types, consent, independent transport failures, strict queue ACK, honeypot, stable retries, edited request and honest fallback UI.');
