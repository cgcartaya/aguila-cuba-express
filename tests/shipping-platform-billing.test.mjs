import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(path, dependencies={}) {
  const module={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,require:n=>n in dependencies?dependencies[n]:require(n)});
  return module.exports;
}
const storeId='211dd255-7168-4045-a278-afc4164a3172';
function harness(role='super_admin',active=true) {
  const writes=[];
  const client={auth:{getUser:async()=>({data:{user:{id:'actor'}}})},from(table){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:table==='profiles'?{role,active}:{id:storeId}}),upsert:async value=>{writes.push(value);return {error:null}}}}};
  const api=load('app/api/saas/shipping-billing/route.ts',{'@/lib/supabase-admin':{supabaseAdmin:client},'next/server':{NextResponse:{json:(body,options)=>({body,status:options.status})}}});
  return {writes,put:body=>api.PUT({headers:new Map([['authorization','Bearer test']]),json:async()=>body})};
}
test('only active superadmins can alter agency tariffs',async()=>{
  for(const [role,active] of [['owner',true],['super_admin',false]]) { const h=harness(role,active); assert.equal((await h.put({store_id:storeId,enabled:true,fee_per_operation:0.4})).status,403);assert.equal(h.writes.length,0); }
});
test('fee configuration is store-specific and does not write any customer totals',async()=>{
  const h=harness();assert.equal((await h.put({store_id:storeId,enabled:true,fee_per_operation:0.4})).status,200);
  assert.equal(h.writes[0].store_id,storeId);assert.equal(h.writes[0].fee_per_operation,0.4);assert.equal(h.writes[0].updated_by,'actor');assert.equal('service_price' in h.writes[0],false);
});
test('invalid, negative, sub-cent and nonfinite tariffs are rejected',async()=>{
  for(const amount of [-1,0,0.401,Infinity,NaN,'0.40',10001]) { const h=harness();assert.equal((await h.put({store_id:storeId,enabled:true,fee_per_operation:amount})).status,400);assert.equal(h.writes.length,0); }
});
test('disabled zero tariff is allowed without charging previous operations',async()=>{
  const h=harness();assert.equal((await h.put({store_id:storeId,enabled:false,fee_per_operation:0})).status,200);
});
test('dashboard labels accrual as agency-paid usage, not a customer surcharge or settled payment',()=>{
  const Card=load('components/admin/shipping/PlatformUsageCard.tsx').default;
  const html=renderToStaticMarkup(React.createElement(Card,{billing:{enabled:true,fee_per_operation:0.4,today_count:2,today_amount:0.8,month_count:100,month_amount:40,total_count:100,total_amount:40}}));
  assert.match(html,/\$0\.40 por operación/);assert.match(html,/\$40\.00/);assert.match(html,/No se suma a la factura del cliente/);assert.match(html,/no pagos liquidados/);
});
