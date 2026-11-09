import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {createRequire} from 'node:module';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(path,deps={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>n in deps?deps[n]:require(n)});return module.exports;}
const {needsAssignment}=load('lib/shipping/dashboard-priorities.ts');
test('work queue excludes closed operations and respects explicit and legacy assignments',()=>{const base={id:'a',status:'preparing'};assert.equal(needsAssignment(base),true);for(const extra of [{status:'delivered'},{status:'cancelled'},{assigned_staff_id:'staff'},{assigned_driver_id:'driver'},{assigned_driver_name:'Legacy'}])assert.equal(needsAssignment({...base,...extra}),false);assert.equal(needsAssignment({...base,status:'issue'}),true);});
test('dashboard reads past API default row limit and rejects incomplete financial data on error',async()=>{const {readDashboardPages}=load('lib/shipping/dashboard-pagination.ts');const rows=Array.from({length:1234},(_,id)=>({id}));const calls=[];const result=await readDashboardPages(async(a,b)=>{calls.push(a);return {data:rows.slice(a,b+1),error:null};});assert.equal(result.data.length,1234);assert.deepEqual(calls,[0,500,1000]);const bad=await readDashboardPages(async a=>a?{data:null,error:{message:'offline'}}:{data:rows.slice(0,500),error:null});assert.equal(bad.data,null);assert.equal(bad.error.message,'offline');});
const summary={total_active:0,pending_total:0,unassigned_total:0,received_cuba_total:0,issues_total:0,outstanding_total:0,created_this_week:0,billed_this_month:0};
function render(extra={}){const stub=()=>null;const Component=load('components/admin/shipping/dashboard/ShippingOperationsOverview.tsx',{'next/link':({children,...props})=>React.createElement('a',props,children),'../PlatformUsageCard':stub,'./RemittanceEarningsCard':load('components/admin/shipping/dashboard/RemittanceEarningsCard.tsx').default,'./DriverPerformance':stub,'./SevenDayActivity':stub,'./TopDestinations':stub}).default;return renderToStaticMarkup(React.createElement(Component,{dashboard:{summary,statuses:[],attention_shipments:[],drivers:[],last_7_days:[],top_destinations:[]},storeName:'Agencia de prueba',canCreate:false,...extra}));}
test('new dashboard links to real filtered lists and distinguishes billing from collection',()=>{const html=render();assert.match(html,/assignment=unassigned/);assert.match(html,/status=received_cuba/);assert.match(html,/payment=partial/);assert.match(html,/Facturado no significa cobrado/);assert.doesNotMatch(html,/Nueva operación|ENV-001|Cliente de ejemplo|PROPUESTA DE DISEÑO/);});
test('data errors never masquerade as a zero-valued healthy dashboard',()=>{const html=render({error:'Sin conexión'});assert.match(html,/Sin conexión/);assert.doesNotMatch(html,/Pendientes activos|Mi próxima acción/);});

test('remittance earnings state the period and distinguish principal from agency commission',()=>{
 const earnings={count:1,withoutCharge:0,billed:110,paid:110,principal:100,gross:10,discounts:0,earned:10,collected:10,platform:.4,afterPlatform:9.6};
 const html=render({canOnlinePayments:true,dashboard:{summary,statuses:[],attention_shipments:[],remittance_earnings:earnings}});
 assert.match(html,/Principal de remesas/);
 assert.match(html,/Comisión de la agencia/);
 assert.match(html,/Antes de gastos operativos/);
 assert.match(html,/9.60/);
});
