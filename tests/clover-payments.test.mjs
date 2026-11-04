import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
const require=createRequire(import.meta.url);
function load(path,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>mocks[n]||require(n),Buffer,Date,URL,AbortSignal,console:{info(){},warn(){},error(){}},fetch:mocks.fetch});return module.exports;}
const {verifyCloverSignature}=load('lib/payments/clover-signature.ts');
test('Clover signatures validate raw bytes and reject replay, tampering and malformed signatures',()=>{
 const now=1700000000000,raw='{"type":"PAYMENT","status":"APPROVED"}',secret='test-only';
 const sig=createHmac('sha256',secret).update(`1700000000.${raw}`).digest('hex');
 assert.equal(verifyCloverSignature(raw,`t=1700000000,v1=${sig}`,secret,now),true);
 for(const [body,header,key,time] of [[raw+' ',`t=1700000000,v1=${sig}`,secret,now],[raw,`t=1700000000,v1=${sig}`,'wrong',now],[raw,`t=1700000000,v1=${sig}`,secret,now+301000],[raw,'t=NaN,v1=00',secret,now],[raw,'t=1700000000,v1=00',secret,now]])assert.equal(verifyCloverSignature(body,header,key,time),false);
});
function harness(active=null){const calls=[];let sent;const db={from(table){let op='read',patch;const q={select(){return q},eq(){return q},in(){return q},lt(){return q},update(v){op='update';patch=v;return q},insert(v){op='insert';patch=v;return q},maybeSingle:async()=>({data:active,error:null}),single:async()=>({data:{id:'reservation'},error:null}),then(resolve){calls.push({table,op,patch});return Promise.resolve({error:null}).then(resolve)}};return q}};const api=load('lib/services/clover-admin.ts',{'@/lib/supabase-admin':{supabaseAdmin:db},'@/lib/config/features':{CARD_SURCHARGE_RATE:.035},fetch:async(url,options)=>{sent={url,options,body:JSON.parse(options.body)};return {ok:true,json:async()=>({href:'https://checkout.clover.com/pay/test',checkoutSessionId:'session',expirationTime:Date.now()+900000})}}});return {api,calls,get sent(){return sent}};}
const settings={enabled:true,merchant_id:'merchant',private_token:'test-only',environment:'sandbox'};
const params={storeId:'store',targetType:'order',targetId:'order',amountCents:10000,name:'Pedido',successUrl:'https://store.example/success',failureUrl:'https://store.example/failure'};
test('checkout uses server amount, separate surcharge and server credentials',async()=>{const h=harness();const url=await h.api.createCloverCheckout(settings,params);assert.equal(url,'https://checkout.clover.com/pay/test');assert.equal(h.sent.url,'https://apisandbox.dev.clover.com/invoicingcheckoutservice/v1/checkouts');assert.equal(h.sent.options.headers.Authorization,'Bearer test-only');assert.equal(h.sent.body.shoppingCart.lineItems[0].price,10000);assert.equal(h.sent.body.shoppingCart.lineItems[1].price,350);assert.equal(h.calls.find(x=>x.op==='update'&&x.patch.session_id)?.patch.session_id,'session');});
test('reuses active session and refuses changed amount instead of creating competing payment',async()=>{const h=harness({checkout_url:'https://checkout.clover.com/existing',base_cents:10000});assert.equal(await h.api.createCloverCheckout(settings,params),'https://checkout.clover.com/existing');assert.equal(h.sent,undefined);await assert.rejects(h.api.createCloverCheckout(settings,{...params,amountCents:12000}),/cobro en curso/);});
test('invalid totals and disabled merchant never reach Clover',async()=>{for(const amountCents of [0,-1,NaN,10.5]){const h=harness();await assert.rejects(h.api.createCloverCheckout(settings,{...params,amountCents}));assert.equal(h.sent,undefined);}await assert.rejects(harness().api.createCloverCheckout({...settings,enabled:false},params));});
test('webhook only settles signed approved payments for the configured merchant',async()=>{
 const calls=[];const secret='webhook-test';
 const api=load('app/api/webhooks/clover/[storeId]/route.ts',{'@/lib/supabase-admin':{supabaseAdmin:{rpc:async(name,args)=>{calls.push({name,args});return {data:'paid',error:null}}}},'@/lib/services/clover-admin':{getCloverSettings:async()=>({merchant_id:'merchant',webhook_secret:secret,enabled:false})},'@/lib/payments/clover-signature':{verifyCloverSignature}});
 const send=async(event,valid=true)=>{const raw=JSON.stringify(event),t=Math.floor(Date.now()/1000);const sig=createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex');return api.POST({text:async()=>raw,headers:{get:()=>valid?`t=${t},v1=${sig}`:'invalid'}},{params:Promise.resolve({storeId:'store'})});};
 const event={type:'PAYMENT',status:'APPROVED',merchantId:'merchant',data:'session',id:'payment'};
 assert.equal((await send({test:true})).status,200);assert.equal(calls.length,0);
 assert.equal((await send({test:true},false)).status,401);assert.equal(calls.length,0);
 assert.equal((await send({...event,test:true,merchantId:'other'})).status,400);assert.equal(calls.length,0);
 assert.equal((await send(event,false)).status,401);assert.equal(calls.length,0);
 assert.equal((await send({...event,merchantId:'other'})).status,400);assert.equal(calls.length,0);
 assert.equal((await send({...event,status:'DECLINED'})).status,200);assert.equal(calls.length,0);
 assert.equal((await send({...event,type:'REFUND'})).status,200);assert.equal(calls.length,0);
 assert.equal((await send(event)).status,200);assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)),{p_store_id:'store',p_session_id:'session',p_merchant_id:'merchant',p_payment_id:'payment'});
});

test('dashboard reachability probes succeed without configuring or settling a payment',async()=>{
 let called=false;
 const api=load('app/api/webhooks/clover/[storeId]/route.ts',{'@/lib/supabase-admin':{supabaseAdmin:{rpc:async()=>{called=true;throw Error('Must not settle')}}},'@/lib/services/clover-admin':{getCloverSettings:async()=>{called=true;throw Error('Must not read secrets')}},'@/lib/payments/clover-signature':{verifyCloverSignature}});
 assert.equal((await api.GET()).status,200);
 for(const raw of ['', '{}','{"verificationCode":"dashboard-test"}']){
  const response=await api.POST({text:async()=>raw,headers:{get:()=>null}},{params:Promise.resolve({storeId:'store'})});
  assert.equal(response.status,200);assert.equal(called,false);
 }
});
