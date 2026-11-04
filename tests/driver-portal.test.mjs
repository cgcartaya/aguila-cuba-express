import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
function load(path,deps={}){
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,require:n=>n in deps?deps[n]:require(n),Response,Request,File,Buffer,URL,console,process:{env:{SUPABASE_SERVICE_ROLE_KEY:'unit-test-key'}}});return module.exports;
}
const policy=load('lib/delivery/policy.ts');
const storeId='11111111-1111-4111-8111-111111111111', staffId='22222222-2222-4222-8222-222222222222', legacyId='33333333-3333-4333-8333-333333333333';
const scope={storeId,staffId,legacyId};
function backend(records={}){
 const calls=[],writes=[];
 const db={rpc:async()=>({data:1}),storage:{from:()=>({remove:async paths=>{calls.push(['remove',paths]);return {};},upload:async path=>{calls.push(['upload',path]);return {};}})},from(table){
  const filters=[];let write=null;
  const q={select(){return q},eq(...v){filters.push(['eq',...v]);return q},gt(...v){filters.push(['gt',...v]);return q},is(...v){filters.push(['is',...v]);return q},or(...v){filters.push(['or',...v]);return q},limit(){return q},insert(value){writes.push([table,value]);return Promise.resolve({error:null})},update(value){write=value;writes.push([table,value]);return q},delete(){return q},maybeSingle(){return q.then(v=>v)},then(resolve,reject){calls.push([table,filters,write]);const data=typeof records[table]==='function'?records[table](filters,write):records[table]??null;return Promise.resolve({data,error:null}).then(resolve,reject)}};return q;
 }};
 return {db,calls,writes};
}
function server(h){return load('lib/delivery/server.ts',{'server-only':{},'@/lib/supabase-admin':{supabaseAdmin:h.db},'./policy':policy});}
test('legacy scope cannot claim a shipment already assigned to another staff member',()=>{
 assert.match(policy.assignmentFilter(scope),/and\(assigned_staff_id.is.null,assigned_driver_id.eq/);
 assert.throws(()=>policy.assignmentFilter({...scope,staffId:'bad,or(eq)',legacyId:null}));
});
test('every operational status patch leaves customer amounts and platform fees untouched',()=>{
 for(const status of ['out_for_delivery','issue','delivered','photo']){
  const patch=policy.operationPatch(status,'2026-11-04T10:00:00Z');
  assert.ok(Object.keys(patch).every(k=>['status','delivered','delivered_date','updated_at'].includes(k)));
  assert.equal(patch.delivered,status==='photo'?undefined:status==='delivered');
 }
 assert.throws(()=>policy.operationPatch('cancelled','now'));
});
test('suspended staff login never falls back to legacy credentials',async()=>{
 const h=backend({stores:{id:storeId,is_active:true,module_shipping_enabled:true},staff_users:{id:staffId,store_id:storeId,username:'driver',password_hash:require('node:crypto').createHash('sha256').update('password').digest('hex'),status:'SUSPENDED',role:'DELIVERY'}});
 await assert.rejects(server(h).login('agency','driver','password'),e=>e.status===401);
 assert.equal(h.calls.some(([table])=>table==='app_users'),false);assert.equal(h.writes.length,0);
});
test('legacy account linked to suspended staff is rejected despite a valid old password',async()=>{
 const h=backend({staff_users:[{id:staffId,status:'SUSPENDED',role:'DELIVERY'}]});
 await assert.rejects(server(h).identity('legacy',{id:legacyId,store_id:storeId,is_active:true,role:'DRIVER'},storeId),e=>e.status===401);
});
test('session password changes revoke access and missing cookie never queries shipments',async()=>{
 const h=backend({driver_portal_sessions:{account_id:staffId,account_source:'staff',store_id:storeId,credential_fingerprint:'old'},staff_users:{password_hash:'changed'}}),s=server(h);
 await assert.rejects(s.session({cookies:{get:()=>({value:'a'.repeat(64)})}}),e=>e.status===401);
 await assert.rejects(s.session({cookies:{get:()=>null}}),e=>e.status===401);
 assert.equal(h.calls.some(([table])=>table==='shipments'),false);
});
test('cross-origin and simple form requests cannot mutate a session',()=>{
 const s=server(backend());
 for(const headers of [new Map([['origin','https://evil.example'],['x-delivery-request','1']]),new Map([['origin','https://agency.example']])])assert.throws(()=>s.checkOrigin({url:'https://agency.example/api/delivery/session',headers}),e=>e.status===403);
});
function routeHarness({current,concurrent=false,failUpload=false}={}){
 const h=backend({shipments:(_filters,write)=>write?(concurrent?null:{...current,...write}):current});
 if(failUpload)h.db.storage.from=()=>({upload:async()=>({error:new Error('upload failed')}),remove:async()=>({})});
 const s=server(h);
 const api=load('app/api/delivery/shipments/route.ts',{'next/server':{},'@/lib/supabase-admin':{supabaseAdmin:h.db},'@/lib/delivery/server':{...s,session:async()=>({scope}),assigned:()=>h.db.from('shipments').select().eq('store_id',storeId).is('deleted_at',null).or(policy.assignmentFilter(scope))},'@/lib/delivery/policy':policy});
 const post=async(action='delivered',photo=null,version=current?.updated_at)=>{
  const form=new FormData();form.set('id','shipment-1');form.set('version',version||'2026-11-04T09:00:00Z');form.set('action',action);if(photo)form.set('photo',photo);
  return api.POST({url:'https://agency.example/api/delivery/shipments',headers:new Map([['origin','https://agency.example'],['x-delivery-request','1']]),formData:async()=>form});
 };return {...h,post};
}
const current={id:'shipment-1',updated_at:'2026-11-04T09:00:00Z',status:'pending',delivered:false};
test('stale updates and reassigned shipments cannot be marked as delivered',async()=>{
 const stale=routeHarness({current});assert.equal((await stale.post('delivered',null,'2026-11-03T09:00:00Z')).status,409);assert.equal(stale.writes.length,0);
 const moved=routeHarness({current,concurrent:true});assert.equal((await moved.post()).status,409);
 const mutation=moved.calls.find(([table,,write])=>table==='shipments'&&write);
 assert.ok(mutation[1].some(v=>v[0]==='eq'&&v[1]==='store_id'&&v[2]===storeId));assert.ok(mutation[1].some(v=>v[0]==='eq'&&v[1]==='updated_at'&&v[2]===current.updated_at));assert.ok(mutation[1].some(v=>v[0]==='or'));assert.ok(mutation[1].some(v=>v[0]==='is'&&v[1]==='deleted_at'));
});
test('driver cannot reopen a delivered shipment or deliver a cancelled one',async()=>{
 for(const row of [{...current,delivered:true},{...current,status:'cancelled'}]){const h=routeHarness({current:row});assert.equal((await h.post('issue')).status,409);assert.equal(h.writes.length,0);}
});
test('photo-only saves attach JPEG evidence without changing delivery status; failed CAS removes upload',async()=>{
 const image=await require('sharp')({create:{width:4,height:4,channels:3,background:'white'}}).png().toBuffer();
 const file=new File([image],'photo.png',{type:'image/png'});
 const good=routeHarness({current});assert.equal((await good.post('photo',file)).status,200);
 assert.equal('status' in good.writes[0][1],false);assert.match(good.writes[0][1].delivery_photo_url,new RegExp('^'+storeId+'/shipment-1/.*\\.jpg$'));
 const failed=routeHarness({current,concurrent:true});assert.equal((await failed.post('delivered',file)).status,409);assert.equal(failed.calls.filter(c=>c[0]==='remove').length,1);
});
test('invalid photos and storage outages never mark a shipment as delivered',async()=>{
 const h=routeHarness({current});assert.equal((await h.post('delivered',new File(['not-an-image'],'fake.jpg',{type:'image/jpeg'}))).status,400);assert.equal(h.writes.length,0);
 const image=await require('sharp')({create:{width:4,height:4,channels:3,background:'white'}}).png().toBuffer();
 const down=routeHarness({current,failUpload:true});assert.equal((await down.post('delivered',new File([image],'test.png'))).status,503);assert.equal(down.writes.length,0);
});
test('service worker caches only public offline page, never delivery data',()=>{
 const src=fs.readFileSync('app/repartidores/sw.js/route.ts','utf8');
 assert.equal((src.match(/c\.add\(/g)||[]).length,1);assert.match(src,/mode==='navigate'/);assert.doesNotMatch(src,/cache\.put|c\.put|addAll/);
 const ui=fs.readFileSync('components/delivery/DriverPortal.tsx','utf8');assert.doesNotMatch(ui,/localStorage|sessionStorage|service_role/);
});

test('both Android evidence formats are readable only for the owned shipment',()=>{
 assert.equal(policy.ownedEvidencePath(`${storeId}/shipment-1/photo.jpg`,scope,'shipment-1','ENV-123'),true);
 assert.equal(policy.ownedEvidencePath('ENV-123/entrega.jpg',scope,'shipment-1','ENV-123'),true);
 for(const path of ['OTHER/entrega.jpg',`${storeId}/other-shipment/photo.jpg`,'https://other.example/photo.jpg',`${storeId}/shipment-1/../other/photo.jpg`])assert.equal(policy.ownedEvidencePath(path,scope,'shipment-1','ENV-123'),false);
});
test('successful logins store only a hash of a unique revocable session token scoped to the agency',async()=>{
 const password='unit-test-only-password';
 const h=backend({stores:{id:storeId,name:'Test agency',slug:'agency',is_active:true,module_shipping_enabled:true},staff_users:{id:staffId,store_id:storeId,username:'driver',password_hash:require('node:crypto').createHash('sha256').update(password).digest('hex'),status:'ACTIVE',role:'DELIVERY'}});
 const s=server(h);const a=await s.login('agency','driver',password),b=await s.login('agency','driver',password);
 assert.notEqual(a,b);assert.equal(a.length,64);
 const saved=h.writes[0][1];assert.equal(saved.token_hash,s.sha(a));assert.notEqual(saved.token_hash,a);assert.equal(saved.store_id,storeId);assert.equal(saved.account_id,staffId);assert.equal(saved.account_source,'staff');assert.ok(Date.parse(saved.expires_at)>Date.now());assert.equal(JSON.stringify(saved).includes(password),false);
 const staffQuery=h.calls.find(([table])=>table==='staff_users');assert.ok(staffQuery[1].some(v=>v[0]==='eq'&&v[1]==='store_id'&&v[2]===storeId));
});
test('durable throttle rejects excess attempts before looking up accounts or writing sessions',async()=>{
 const h=backend();h.db.rpc=async()=>({data:11});await assert.rejects(server(h).login('agency','driver','password'),e=>e.status===429);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
test('staff account in another store and disabled shipping module cannot open a session',async()=>{
 const h=backend();await assert.rejects(server(h).identity('staff',{id:staffId,store_id:legacyId,status:'ACTIVE',role:'DELIVERY'},storeId),e=>e.status===401);
 const disabled=backend({stores:{id:storeId,is_active:true,module_shipping_enabled:false}});await assert.rejects(server(disabled).storeFor(storeId),e=>e.status===403);
});

test('filters and totals receive every assigned page, not just the first 50',async()=>{
 const {loadDriverPages}=load('lib/delivery/pages.ts');const pages=[];
 const rows=await loadDriverPages(async page=>{pages.push(page);return {rows:page===0?Array.from({length:50},(_,i)=>({id:String(i)})):[{id:'50'},{id:'51'}],hasMore:page===0};});
 assert.equal(rows.length,52);assert.deepEqual(pages,[0,1]);
 await assert.rejects(loadDriverPages(async()=>({rows:[],hasMore:true})),/Listado incompleto/);
});
test('photo of a linked staff driver is returned for the legacy APK identity',async()=>{
 const h=backend({staff_users:[{id:staffId,status:'ACTIVE',role:'DELIVERY',photo_url:'https://example.com/driver.jpg'}]});
 const result=await server(h).identity('legacy',{id:legacyId,store_id:storeId,is_active:true,role:'DRIVER'},storeId);
 assert.equal(result.photoUrl,'https://example.com/driver.jpg');assert.equal(result.scope.staffId,staffId);
});
