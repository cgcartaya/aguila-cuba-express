import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,deps={}){const compiled={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:compiled,exports:compiled.exports,require:name=>deps[name]});return compiled.exports;}
const fees=load('lib/shipping/extra-fee-calculation.ts');
const {normalizePackageBilling}=load('lib/shipping/package-billing.ts',{'@/lib/shipping/extra-fee-calculation':fees});
const input={contains_package:true,package_billing_mode:'fees_only',weight_lb:10,rate_per_lb:6,weight_subtotal:60,selected_fees:[{fee_name:'Teléfono',configured_amount:20,quantity:2,calculated_amount:0,calculation_type:'fixed'}]};
test('fee-only parcels zero out all weight charges and calculate the item counts',()=>{const result=normalizePackageBilling(input);assert.equal(result.weight_subtotal,0);assert.equal(result.weight_lb,0);assert.equal(result.rate_per_lb,0);assert.equal(result.extra_fees_total,40);assert.equal(result.service_type_id,null);});
test('empty, zero and non-fixed fees cannot replace the weight tariff',()=>{for(const selected_fees of [[],[{...input.selected_fees[0],configured_amount:0}],[{...input.selected_fees[0],calculation_type:'per_lb'}],[{...input.selected_fees[0],calculation_type:'percentage'}]])assert.throws(()=>normalizePackageBilling({...input,selected_fees}));});
test('regular weight billing retains the original weight and money-only ignores parcel pricing',()=>{assert.equal(normalizePackageBilling({...input,package_billing_mode:'weight'}).weight_subtotal,60);assert.equal(normalizePackageBilling({...input,contains_package:false}).package_billing_mode,'weight');});
