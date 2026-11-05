import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, mocks = {}, globals = {}) {
 const module = {exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
  {module,exports:module.exports,require:name=>{if(name in mocks)return mocks[name];throw Error(name);},AbortSignal,Date,...globals});
 return module.exports;
}
const delivery=load('lib/shipping/remittance-delivery.ts');
const formatter=load('lib/notifications/remittance-whatsapp-message.ts',{'@/lib/shipping/remittance-delivery':delivery});
test('recipient gets principal only, no payment instructions, sanitized data and honest missing fields',()=>{
 const message=formatter.remittanceWhatsappMessage('REF',{recipient_name:'Ana\nInjected',total:110,commission:10},100,false);
 assert.match(message,/100\.00 USD/);assert.doesNotMatch(message,/110\.00/);assert.doesNotMatch(message,/Estado del pago|Pendiente de pago|Pago registrado/);
 assert.match(message,/Ana Injected/);assert.match(message,/Remitente: No informado/);
 assert.throws(()=>formatter.remittanceWhatsappMessage('x',{},NaN,true));
});
function harness({env={},chat={},postStatus=200,postBody={status:'ok',data:{message_uid:'uid'}},network=false,source=null,jobs=true}={}) {
 const calls=[],updates=[];
 const job={id:'job',store_id:'alvarez',source_kind:'order',source_id:'order',claim_token:'claim'};
 const db={rpc:async()=>({data:jobs?[job]:[],error:null}),from(table){
  const filters=[];let patch;
  const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},update(v){patch=v;return q;},
   async maybeSingle(){return {data:table==='stores'?{id:'alvarez'}:table==='shipping_settings'?{currency:'USD'}:source??{status:'pending',payload:{recipient_name:'Ana'},amount:100},error:null};},
   then(resolve){updates.push({table,patch,filters});return Promise.resolve({error:null}).then(resolve);}};return q;
 }};
 const api=load('lib/notifications/alvarez-remittance-whatsapp.ts',{'server-only':{},'@/lib/supabase-admin':{supabaseAdmin:db},'./remittance-whatsapp-message':formatter},{
 process:{env:{VERCEL_ENV:'production',ALVAREZ_TIMELINES_API_TOKEN:'test-secret',ALVAREZ_TIMELINES_CHAT_ID:'57099880',...env}},
 fetch:async(url,options)=>{calls.push({url,options});if(options.method==='POST'){if(network)throw Error('timeout');return {ok:postStatus<300,status:postStatus,json:async()=>postBody};}return {ok:true,status:200,json:async()=>({status:'ok',data:{id:57099880,name:'Entrada de pedidos',...chat}})};}
 });return {api,calls,updates};
}
test('preview, missing credentials and wrong destination cannot send',async()=>{
 for(const options of [{env:{VERCEL_ENV:'preview'}},{env:{ALVAREZ_TIMELINES_API_TOKEN:''}},{env:{ALVAREZ_TIMELINES_CHAT_ID:'other'}},{chat:{name:'Otro grupo'}}]){
  const h=harness(options);await h.api.drainRemittanceWhatsapp();assert.equal(h.calls.filter(c=>c.options.method==='POST').length,0);assert.equal(h.updates.length,0);
 }
});
test('accepted notification stores provider reference and guarded claim ownership',async()=>{
 const h=harness();await h.api.drainRemittanceWhatsapp();assert.equal(h.updates[0].patch.state,'accepted');assert.equal(h.updates[0].patch.provider_message_id,'uid');
 assert.ok(h.updates[0].filters.some(([k,v])=>k==='claim_token'&&v==='claim'));
 assert.match(JSON.parse(h.calls[1].options.body).text,/100\.00 USD/);
});
test('transport errors, 5xx and missing receipt never auto-retry',async()=>{
 for(const options of [{network:true},{postStatus:503},{postBody:{status:'ok',data:{}}}]){
  const h=harness(options);await h.api.drainRemittanceWhatsapp();assert.equal(h.updates.at(-1).patch.state,'uncertain');assert.equal(h.calls.filter(c=>c.options.method==='POST').length,1);
 }
});
test('429 is a recorded failure and cancelled sources never send',async()=>{
 let h=harness({postStatus:429});await h.api.drainRemittanceWhatsapp();assert.equal(h.updates[0].patch.state,'failed');
 h=harness({source:{status:'cancelled'}});await h.api.drainRemittanceWhatsapp();assert.equal(h.updates[0].patch.state,'cancelled');assert.equal(h.calls.length,1);
 h=harness({jobs:false});await h.api.drainRemittanceWhatsapp();assert.equal(h.calls.length,1);
});
