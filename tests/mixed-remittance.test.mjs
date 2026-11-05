import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(path,mocks={}) {
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,
 {module,exports:module.exports,require:name=>name in mocks?mocks[name]:require(name),Date,Intl});
 return module.exports;
}
const delivery=load('lib/shipping/remittance-delivery.ts');
const formatter=load('lib/notifications/remittance-whatsapp-message.ts',{'@/lib/shipping/remittance-delivery':delivery});
const mixed={money_amount:100,money_delivery_currency:'MIXED',money_usd_to_cup:50,money_exchange_rate:920};
test('one principal can be delivered partly as USD and partly as manually converted MN',()=>{
 const parts=delivery.deliveryParts(mixed);
 assert.equal(parts.usd,50);assert.equal(parts.cup,46000);assert.equal(parts.convertedUsd,50);
 assert.equal(parts.usd+parts.convertedUsd,mixed.money_amount);
 assert.equal(delivery.deliveryLabel(mixed),'50.00 USD + 46,000.00 CUP (MN)');
 assert.equal(delivery.deliveryLabel({...mixed,money_delivery_currency:'USD'}),'100.00 USD');
 assert.equal(delivery.deliveryLabel({...mixed,money_delivery_currency:'CUP'}),'92,000.00 CUP (MN)');
 for(const split of [0,-1,100,101,NaN,Infinity,50.001])assert.throws(()=>delivery.deliveryParts({...mixed,money_usd_to_cup:split}));
});
test('WhatsApp and invoice give the same mixed-cash delivery instruction',()=>{
 const message=formatter.remittanceWhatsappMessage('REF',mixed,100);
 assert.match(message,/Remesa a entregar: 50\.00 USD \+ 46,000\.00 CUP/);
 const Component=load('components/shipping/RemittanceDeliveryDetails.tsx',{'@/lib/shipping/remittance-delivery':delivery}).default;
 const html=require('react-dom/server').renderToStaticMarkup(require('react').createElement(Component,{value:mixed}));
 assert.match(html,/50\.00 USD \+ 46,000\.00 CUP/);assert.match(html,/Se convierten 50\.00 USD a MN/);
});
test('linked product orders cannot start an additional card charge',async()=>{
 let providerCalls=0;
 const q={select(){return q},eq(){return q},is(){return q},maybeSingle:async()=>({data:{id:'order',store_id:'store',source_shipment_id:'shipment',payment_status:'pending',total:102.50},error:null})};
 const api=load('app/api/checkout/pay-with-card/route.ts',{
  'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},
  '@/lib/supabase-admin':{supabaseAdmin:{from:()=>q}},
  '@/lib/services/clover-admin':{getCloverSettings:async()=>{providerCalls++;},createCloverCheckout:()=>{providerCalls++;}},
  '@/lib/services/stripe-admin':{getStoreStripeContext:()=>{providerCalls++;}},
  '@/lib/config/features':{},'@/lib/services/order-stock-admin':{reactivateExpiredOrder:()=>{providerCalls++;}},
 });
 const response=await api.POST({json:async()=>({orderId:'order',storeId:'store'})});
 assert.equal(response.status,409);assert.equal(providerCalls,0);assert.match(response.body.message,/factura del envío/);
});
test('shipping catalog returns the base price without the storefront markup',async()=>{
 const admin={from:table=>{const q={select(){return q},eq(){return q},is(){return q},gt(){return q},order(){return q},limit(){return q},single:async()=>({data:{platform_fee_enabled:true,platform_fee_percent:2.5},error:null}),then(resolve){return Promise.resolve({data:[{id:'product',name:'Product',price:100,stock:5}],error:null}).then(resolve)}};return q;}};
 const api=load('app/api/admin/remittances/products/route.ts',{'next/server':{},'@/lib/supabase-admin':{supabaseAdmin:admin},
  '@/lib/remittances/server':{adminAccess:async()=>{},reply:value=>value,failure:error=>{throw error;}}});
 const response=await api.GET({nextUrl:new URL('https://example.test?storeId=store')});
 assert.equal(response.products[0].price,100);
});

test('shipping catalog filters combos and calculates stock from their components',async()=>{
 const calls=[];
 const admin={from:table=>{
  const rows=table==='products'?[{id:'product',name:'Producto',price:10,stock:5}]:[
   {id:'combo',name:'Combo familiar',price:17,combo_items:[
    {product_id:'product',quantity:2,products:{store_id:'store',stock:5,is_active:true}},
    {product_id:'product',quantity:1,products:{store_id:'store',stock:5,is_active:true}},
   ]},
   {id:'empty',name:'Combo sin componentes',price:20,combo_items:[]},
  ];
  const q={select(){return q},eq(){return q},is(){return q},gt(){return q},order(){return q},limit(){return q},
   ilike(_field,pattern){calls.push([table,pattern]);return q},
   then(resolve){calls.push(table);return Promise.resolve({data:rows,error:null}).then(resolve)}};
  return q;
 }};
 const api=load('app/api/admin/remittances/products/route.ts',{
  'next/server':{},'@/lib/supabase-admin':{supabaseAdmin:admin},
  '@/lib/remittances/server':{adminAccess:async()=>{},reply:value=>value,failure:error=>{throw error;}},
 });
 const result=await api.GET({nextUrl:new URL('https://example.test?storeId=store&kind=combo&search=combo')});
 assert.ok(!calls.includes('products'));
 assert.ok(calls.some(call=>Array.isArray(call)&&call[0]==='combos'&&call[1]==='%combo%'));
 assert.equal(result.products[0].kind,'combo');
 assert.equal(result.products[0].price,17);
 assert.equal(result.products[0].stock,1);
 assert.equal(result.products[1].stock,0);
});
