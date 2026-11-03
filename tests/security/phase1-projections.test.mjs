import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

function harness(path) {
  const selects = [];
  const chain = new Proxy({}, {get(_, key) {
    if(key === 'then') return (resolve) => resolve({data:[],error:null});
    if(key === 'select') return (fields) => { selects.push(fields); return chain; };
    if(key === 'single' || key === 'maybeSingle') return async () => ({data:{id:'fixture'},error:null});
    return () => chain;
  }});
  const client = {from:() => chain};
  const exports = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(path,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  vm.runInNewContext(code,{module:exports,exports:exports.exports,crypto:webcrypto,TextEncoder,console,
    require(name) {
      if(name === '@/lib/supabase') return {supabase:client};
      if(name === '@/lib/supabase-public') return {publicSupabase:client};
      throw new Error('Unexpected dependency '+name);
    }
  });
  return {api:exports.exports,selects};
}
test('store create/update return explicit fields without payment secrets',async()=>{
  const {api,selects}=harness('lib/services/stores.ts');
  await api.createStore({name:'Fixture',slug:'fixture',plan:'basic'});
  await api.updateStore('fixture',{name:'Updated'});
  assert.equal(selects.length,2);
  for(const fields of selects) {
    assert.equal(typeof fields,'string');
    assert.ok(fields.includes('id'));
    assert.ok(!fields.includes('*'));
    assert.ok(!fields.includes('stripe_direct_secret'));
    assert.ok(!fields.includes('stripe_direct_webhook_secret'));
  }
});
test('staff listing, creation and updates never request password hashes',async()=>{
  const {api,selects}=harness('lib/services/shipping-staff.ts');
  const input={store_id:'fixture',username:'fixture',password:'fixture-only',role:'ADMIN',status:'ACTIVE',first_name:'Fake',last_name:'User'};
  await api.getShippingStaff('fixture');
  await api.createShippingStaff(input);
  await api.updateShippingStaff('fixture',input);
  assert.equal(selects.length,3);
  for(const fields of selects) {
    assert.equal(typeof fields,'string');
    assert.ok(!fields.includes('*'));
    assert.ok(!fields.includes('password_hash'));
    assert.ok(fields.includes('legacy_app_user_id'));
  }
});
