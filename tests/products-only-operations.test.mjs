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
 {module,exports:module.exports,require:name=>name in mocks?mocks[name]:require(name),Intl,Date});
 return module.exports;
}
const delivery=load('lib/shipping/remittance-delivery.ts');
const modes=load('lib/shipping/operation-mode.ts');
const fees=load('lib/shipping/extra-fee-calculation.ts');
const billing=load('lib/shipping/package-billing.ts',{'@/lib/shipping/extra-fee-calculation':fees});
const totals=load('lib/shipping/invoice-totals.ts');
const formatter=load('lib/notifications/remittance-whatsapp-message.ts',{'@/lib/shipping/remittance-delivery':delivery});
const products=[{product_id:'chicken',name:'Caja de pollo',quantity:1,unit_price:25}];
test('products-only operation needs products but neither cash, travel nor weight',()=>{
 const content=modes.operationContent('products');assert.equal(content.contains_package,true);assert.equal(content.contains_money,false);assert.equal(content.products_only,true);
 assert.equal(modes.resolveOperationTrip({...content,store_products:products},'old-trip'),null);
 assert.throws(()=>modes.resolveOperationTrip({...content,store_products:[]},null));
 const input=billing.normalizePackageBilling({...content,store_products:products,store_products_total:25,weight_lb:40,weight_subtotal:100,rate_per_lb:2.5,money_amount:100,money_total:110,money_commission:10,money_discount:0,extra_fees_total:0,discount_amount:0,amount_paid:25,package_contents:[{description:'stale parcel',quantity:1}]});
 assert.equal(input.weight_subtotal,0);assert.equal(input.money_amount,0);assert.equal(input.money_total,0);assert.equal(input.package_contents.length,0);assert.equal(totals.shipmentInvoiceTotals(input).total,25);
});
test('products-only WhatsApp lists the products without a fictitious remittance or origin',()=>{
 const message=formatter.remittanceWhatsappMessage('REF',{contains_money:false,store_products:products,recipient_name:'Ana'},0);
 assert.match(message,/Nuevo envío de productos/);assert.match(message,/1× Caja de pollo/);
 assert.doesNotMatch(message,/Origen|Remesa a entregar|Cambio manual|0\.00 USD/);
 assert.throws(()=>formatter.remittanceWhatsappMessage('REF',{contains_money:false,store_products:[]},0));
});
test('MN and mixed WhatsApp keep the delivery cash and remove the origin amount',()=>{
 for(const currency of ['CUP','MIXED']){
  const message=formatter.remittanceWhatsappMessage('REF',{contains_money:true,money_delivery_currency:currency,money_usd_to_cup:50,money_exchange_rate:920},100);
  assert.match(message,currency==='CUP'?/92,000\.00 CUP/:/50\.00 USD \+ 46,000\.00 CUP/);
  assert.doesNotMatch(message,/Origen|100\.00 USD/);
 }
});
test('invoice renders products without displaying zero cash',()=>{
 const Component=load('components/shipping/RemittanceDeliveryDetails.tsx',{'@/lib/shipping/remittance-delivery':delivery}).default;
 const html=require('react-dom/server').renderToStaticMarkup(require('react').createElement(Component,{value:{contains_money:false,money_amount:0,store_products:products}}));
 assert.match(html,/Caja de pollo/);assert.match(html,/25\.00/);assert.doesNotMatch(html,/Dinero a entregar/);
});
test('the form renders a products-only operation without forcing cash or parcel calculation',()=>{
 const empty=()=>null;
 const Component=load('components/admin/shipping/ShipmentForm.tsx',{
  '@/lib/shipping/operation-mode':modes,'@/lib/shipping/package-billing':billing,'@/lib/shipping/invoice-totals':totals,
  './RemittanceProductsEditor':{default:empty},'@/lib/shipping/remittance-delivery':delivery,
  '@/components/admin/shipping/ShipmentExtraFees':{default:empty},'@/lib/shipping/extra-fee-calculation':fees,
  '@/components/admin/shipping/PackageContentsEditor':{default:empty},'@/lib/shipping/package-label':load('lib/shipping/package-label.ts'),
  '@/lib/shipping/weight-rate':load('lib/shipping/weight-rate.ts'),'@/components/admin/shipping/CustomerRecipientPicker':{default:empty},
  '@/lib/shipping/types':load('lib/shipping/types.ts'),
 }).default;
 const props={storeId:'store',operationType:'products',allowRemittanceExtras:true,shipment:{store_products:products},drivers:[],settings:null,countries:[],provinces:[],municipalities:[],locations:[],serviceTypes:[],rates:[],extraFees:[],submitting:false,onSubmit:async()=>{}};
 const html=require('react-dom/server').renderToStaticMarkup(require('react').createElement(Component,props));
 assert.match(html,/Productos de la tienda/);assert.doesNotMatch(html,/Cálculo del dinero|Cálculo del paquete|Monto enviado \(USD\)/);
});
