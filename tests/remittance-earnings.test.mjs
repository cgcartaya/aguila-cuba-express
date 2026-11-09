import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/shipping/remittance-earnings.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { remittanceEarnings } = module.exports;
const row = { id:'one',status:'preparing',contains_money:true,money_amount:100,money_commission:10,money_discount:0,discount_amount:0,billed:110,paid:110 };

test('principal and invoice totals are excluded from agency earnings',()=>{
 const result=remittanceEarnings([row],[{shipment_id:'one',amount:.4}]);
 assert.equal(result.principal,100);
 assert.equal(result.earned,10);
 assert.equal(result.collected,10);
 assert.equal(result.afterPlatform,9.6);
 assert.equal(result.billed,110);
});
test('historical fixed fees and rebates use saved values rather than current tariff',()=>{
 const result=remittanceEarnings([{...row,money_amount:20,money_commission:10,money_discount:.03,discount_amount:1,billed:28.97,paid:28.97}],[{shipment_id:'one',amount:.6}]);
 assert.equal(result.earned,8.97);
 assert.equal(result.afterPlatform,8.37);
});
test('partial payments are not presented as a fully collected commission',()=>{
 const result=remittanceEarnings([{...row,paid:50}],[]);
 assert.equal(result.paid,50);
 assert.equal(result.earned,10);
 assert.equal(result.collected,0);
 assert.equal(result.withoutCharge,1);
});
test('cancelled records are excluded and package sales do not become remittance earnings',()=>{
 const result=remittanceEarnings([{...row,status:'cancelled'},{...row,id:'parcel',contains_money:false}],[]);
 assert.equal(result.count,0);
 assert.equal(result.earned,0);
 assert.equal(result.billed,110);
});
test('rebates exceeding commission cannot turn principal into negative agency income',()=>{
 const result=remittanceEarnings([{...row,discount_amount:30}],[]);
 assert.equal(result.earned,0);
 assert.equal(result.discounts,10);
});
