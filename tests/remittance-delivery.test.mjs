import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(path,mocks={}) {
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>name in mocks?mocks[name]:require(name),Date,Intl});
 return module.exports;
}
const delivery=load('lib/shipping/remittance-delivery.ts');
const totals=load('lib/shipping/invoice-totals.ts');
const formatter=load('lib/notifications/remittance-whatsapp-message.ts',{'@/lib/shipping/remittance-delivery':delivery});
const products=[{product_id:'chicken',name:'Caja de pollo',quantity:1,unit_price:25},{product_id:'beer',name:'Caja de cervezas',quantity:2,unit_price:15}];
test('manual conversion uses exactly the agency rate and keeps USD invoicing separate',()=>{
 assert.equal(delivery.deliveryAmount(100,'CUP',920),92000);
 assert.equal(delivery.deliveryAmount(100,'USD',920),100);
 assert.equal(delivery.deliveryAmount(1.23,'CUP',920.5),1132.22);
 for(const rate of [undefined,0,-1,Infinity,1000001])assert.throws(()=>delivery.deliveryAmount(100,'CUP',rate));
 const bill=totals.shipmentInvoiceTotals({contains_package:false,weight_subtotal:0,contains_money:true,money_total:110,store_products_total:delivery.productsTotal(products),extra_fees_total:0,discount_amount:5,amount_paid:160});
 assert.equal(bill.subtotal,165);assert.equal(bill.total,160);assert.equal(bill.balance,0);
});
test('WhatsApp lists MN, agency rate and every product without payment claims',()=>{
 const text=formatter.remittanceWhatsappMessage('REF',{money_delivery_currency:'CUP',money_exchange_rate:920,money_delivery_amount:92000,store_products:products},100);
 assert.match(text,/92,000\.00 CUP \(MN\)/);assert.match(text,/1 USD = 920 CUP/);
 assert.match(text,/1× Caja de pollo/);assert.match(text,/2× Caja de cervezas/);
 assert.doesNotMatch(text,/Estado del pago|Pendiente de pago|Pago registrado|AppSheet/);
});
test('invoice and driver detail render the same delivery amount and product quantities',()=>{
 const Component=load('components/shipping/RemittanceDeliveryDetails.tsx',{'@/lib/shipping/remittance-delivery':delivery}).default;
 const React=require('react'); const {renderToStaticMarkup}=require('react-dom/server');
 const html=renderToStaticMarkup(React.createElement(Component,{value:{money_amount:100,money_delivery_currency:'CUP',money_exchange_rate:920,money_delivery_amount:92000,store_products:products}}));
 assert.match(html,/92,000\.00 CUP/);assert.match(html,/2 × Caja de cervezas/);assert.match(html,/30\.00/);
});
test('notification state is scoped to both tenant and authenticated administrator',async()=>{
 const calls=[];const db={from(table){const q={select(){return q},eq(k,v){calls.push([table,k,v]);return q},neq(){return q},gt(){return q},lte(){return q},maybeSingle:async()=>({data:{last_seen_at:'2026-01-01'},error:null}),then(resolve){return Promise.resolve({count:2,error:null}).then(resolve)}};return q;}};
 const route=load('app/api/admin/remittances/notifications/route.ts',{
  'next/server':{},'@/lib/supabase-admin':{supabaseAdmin:db},'@/lib/remittances/validation':{UUID:/^store$/},
  '@/lib/remittances/server':{adminAccess:async()=> 'actor',reply:value=>value,failure:error=>{throw error;},RemittanceError:Error}
 });
 const result=await route.GET({nextUrl:new URL('https://example.test?storeId=store')});
 assert.equal(result.unread,2);
 assert.ok(calls.some(([table,key,value])=>table==='remittance_notification_reads'&&key==='user_id'&&value==='actor'));
 assert.ok(calls.filter(([,key])=>key==='store_id').every(([, ,value])=>value==='store'));
});
