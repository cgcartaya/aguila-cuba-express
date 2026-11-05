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
test('administrative catalog uses the same configured customer price as the store',async()=>{
 const pricing=load('lib/storefront/product-quantity-pricing.ts');
 const admin={from:table=>{const q={select(){return q},eq(){return q},is(){return q},gt(){return q},order(){return q},limit(){return q},single:async()=>({data:{platform_fee_enabled:true,platform_fee_percent:2.5},error:null}),then(resolve){return Promise.resolve({data:[{id:'product',name:'Product',price:100,stock:5}],error:null}).then(resolve)}};return q;}};
 const api=load('app/api/admin/remittances/products/route.ts',{'next/server':{},'@/lib/supabase-admin':{supabaseAdmin:admin},'@/lib/storefront/product-quantity-pricing':pricing,
  '@/lib/remittances/server':{adminAccess:async()=>{},reply:value=>value,failure:error=>{throw error;}}});
 const response=await api.GET({nextUrl:new URL('https://example.test?storeId=store')});
 assert.equal(response.products[0].price,102.50);assert.equal(response.products[0].base_price,100);
});
