const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {NextRequest,NextResponse}=require('next/server');
const itineraryModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/pickups/itinerary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:itineraryModule,exports:itineraryModule.exports,Intl,Date,Set});
const itin=itineraryModule.exports;
function database(replies){
 const calls=[];
 return {calls,from(table){const expected=replies.shift();assert.ok(expected,`unexpected query ${table}`);assert.equal(table,expected.table);const call={table,methods:[]};calls.push(call);const builder={};for(const method of ['select','eq','gte','in','order','limit','not','insert','update','delete'])builder[method]=(...args)=>{call.methods.push([method,...args]);return builder;};builder.maybeSingle=builder.single=()=>Promise.resolve(expected.value);builder.then=(resolve,reject)=>Promise.resolve(expected.value).then(resolve,reject);return builder;}};
}
function load(path,db,{denied=null,env={},fetcher=()=>{throw Error('unexpected external request')}}={}){
 const module={exports:{}};
 const mocks={'next/server':{NextResponse},'@/lib/supabase-admin':{supabaseAdmin:db},'@/lib/pickups/route-access':{requirePickupRouteWrite:async()=>denied},'@/lib/pickups/itinerary':itin,'@/lib/pickups/route-image':{prepareRouteImage:async()=>Buffer.from('fixture')},'@/lib/geo/location-catalog':{getCityOptions:()=>[{label:'Conway',latitude:'33.836',longitude:'-79.047'},{label:'Little River',latitude:'33.873',longitude:'-78.614'}]}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,require:name=>mocks[name]||require(name),process:{env},Date,Intl,Set,Map,Buffer,FormData,File,AbortSignal,crypto:globalThis.crypto,fetch:fetcher});return module.exports;
}
const storeId='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const group={cities:['Conway','Little River'],start_time:'09:00',end_time:'11:00'};
function request(plan){const form=new FormData();form.set('plan',JSON.stringify(plan));return new NextRequest(`https://example.test/api/admin/pickups/routes/quick?store_id=${storeId}`,{method:'POST',body:form});}
const routePath='app/api/admin/pickups/routes/quick/route.ts';
test('quick publish persists announced cities without manufacturing customer requests',async()=>{
 const db=database([{table:'pickup_service_settings',value:{data:{timezone:'America/New_York'}}},{table:'pickup_routes',value:{data:{id}}}]);
 const {POST}=load(routePath,db);
 const r=await POST(request({name:'Costa',route_date:'2099-10-26',itinerary:[group],publish:true,reviewed:true}));assert.equal(r.status,200);
 const inserted=db.calls.find(c=>c.table==='pickup_routes').methods.find(m=>m[0]==='insert')[1];
 assert.equal(inserted.store_id,storeId);assert.equal(inserted.status,'published');assert.equal(inserted.is_public,true);assert.equal(JSON.stringify(inserted.public_itinerary),JSON.stringify([group]));
 assert.equal(db.calls.some(c=>c.table==='pickup_requests'),false);
});
test('publication requires reviewed flag and valid date before writes',async()=>{
 const db=database([{table:'pickup_service_settings',value:{data:{timezone:'America/New_York'}}}]);
 const {POST}=load(routePath,db);assert.equal((await POST(request({name:'Costa',route_date:'2099-10-26',itinerary:[group],publish:true,reviewed:false}))).status,400);
 assert.equal(db.calls.some(c=>c.methods.some(m=>m[0]==='insert')),false);
});
test('editing a route from another store is rejected without mutation',async()=>{
 const db=database([{table:'pickup_service_settings',value:{data:{timezone:'America/New_York'}}},{table:'pickup_routes',value:{data:null}}]);
 const {POST}=load(routePath,db);assert.equal((await POST(request({name:'Costa',route_date:'2099-10-26',itinerary:[group],route_id:id}))).status,400);
 assert.equal(db.calls[1].methods.some(m=>m[0]==='eq'&&m[1]==='store_id'&&m[2]===storeId),true);
 assert.equal(db.calls[1].methods.some(m=>m[0]==='update'),false);
});
test('public route uses announced cities and city centres, never customer coordinates',async()=>{
 const db=database([{table:'stores',value:{data:{id:storeId,module_pickups_enabled:true}}},{table:'pickup_service_settings',value:{data:{timezone:'America/New_York',country_code:'US',region_code:'SC'}}},{table:'pickup_routes',value:{data:[{id,name:'Costa',route_date:'2099-10-26',status:'published',public_itinerary:[group],pickup_route_stops:[{stop_order:1,pickup_requests:{city:'Private City',latitude:1,longitude:2}}]}]}},{table:'pickup_zone_cities',value:{data:[]}}]);
 const {GET}=load('app/api/pickups/routes/public/route.ts',db);const r=await GET(new NextRequest('https://example.test/api/pickups/routes/public?store=yoyo-envios'));const p=await r.json();assert.equal(p.routes[0].cities.length,2);assert.equal(p.routes[0].cities[0].latitude,33.836);assert.equal(p.routes[0].cities[1].start_time,'09:00');
 assert.doesNotMatch(JSON.stringify(p),/Private City/);
 const select=db.calls[2].methods.find(m=>m[0]==='select')[1];assert.doesNotMatch(select,/latitude|longitude/);
});
test('legacy routes still publish unique cities without private locations',async()=>{
 const db=database([{table:'stores',value:{data:{id:storeId,module_pickups_enabled:true}}},{table:'pickup_service_settings',value:{data:{}}},{table:'pickup_routes',value:{data:[{id,name:'Legacy',route_date:'2099-10-26',status:'published',public_itinerary:[],pickup_route_stops:[{stop_order:2,pickup_requests:{city:'Conway'}},{stop_order:1,pickup_requests:{city:'Conway'}}]}]}},{table:'pickup_zone_cities',value:{data:[]}}]);
 const {GET}=load('app/api/pickups/routes/public/route.ts',db);const r=await GET(new NextRequest('https://example.test/api/pickups/routes/public?store=yoyo-envios'));assert.equal((await r.json()).routes[0].cities.length,1);
});
test('interpretation cannot run without authorization or configured key',async()=>{
 const db=database([]);let route=load('app/api/admin/pickups/routes/interpret/route.ts',db,{denied:NextResponse.json({error:'denied'},{status:403})});assert.equal((await route.POST(request({}))).status,403);
 route=load('app/api/admin/pickups/routes/interpret/route.ts',db);assert.equal((await route.POST(request({}))).status,503);
});
test('image interpretation returns an unpersisted draft and does not infer a missing year',async()=>{
 const result={name:'Costa',route_date:null,itinerary:[group],warnings:['Confirma el año del cartel.']};
 const db=database([{table:'pickup_route_image_imports',value:{data:null}},{table:'pickup_route_image_imports',value:{count:0}},{table:'pickup_route_image_imports',value:{data:{id}}},{table:'pickup_route_image_imports',value:{data:null}}]);
 const {POST}=load('app/api/admin/pickups/routes/interpret/route.ts',db,{env:{OPENAI_API_KEY:'fixture'},fetcher:async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');const b=JSON.parse(opts.body);assert.equal(b.store,false);assert.equal(b.text.format.strict,true);assert.match(b.instructions,/YEAR.*null/);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]});}});
 const r=await POST(request({}));assert.equal(r.status,200);assert.equal((await r.json()).result.route_date,null);assert.equal(db.calls.some(c=>c.table==='pickup_routes'),false);
});
test('route authorization rejects missing sessions before database access',async()=>{
 const db=database([]);const {requirePickupRouteWrite}=load('lib/pickups/route-access.ts',db);const result=await requirePickupRouteWrite(new NextRequest('https://example.test'),storeId);assert.equal(result.status,401);
});
test('route authorization checks active store membership and rejects VIEWER',async()=>{
 const db=database([{table:'profiles',value:{data:{active:true,role:'store_owner'}}},{table:'stores',value:{data:{is_active:true,module_pickups_enabled:true}}},{table:'store_users',value:{data:{role:'VIEWER'}}}]);db.auth={getUser:async()=>({data:{user:{id}}})};
 const {requirePickupRouteWrite}=load('lib/pickups/route-access.ts',db);const result=await requirePickupRouteWrite(new NextRequest('https://example.test',{headers:{Authorization:'Bearer fixture'}}),storeId);assert.equal(result.status,403);assert.ok(db.calls[2].methods.some(m=>m[0]==='eq'&&m[1]==='store_id'&&m[2]===storeId));
});

const version='2026-10-24T12:00:00+00:00';
function patchRequest(overrides={}) {
  return new NextRequest(`https://example.test/api/admin/pickups/routes/quick?store_id=${storeId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({route_id:id,expected_updated_at:version,name:'Sábado',route_date:'2026-10-24',public_itinerary:[group],is_public:true,...overrides})});
}
test('editing an in-progress route changes cities while preserving its lifecycle and customers',async()=>{
  const db=database([{table:'pickup_routes',value:{data:{id,status:'in_progress',updated_at:version}}},{table:'pickup_routes',value:{data:{id,status:'in_progress',is_public:true,updated_at:'new-version',public_itinerary:[group]}}}]);
  const {PATCH}=load(routePath,db);const response=await PATCH(patchRequest({status:'draft',published_at:'invalid'}));assert.equal(response.status,200);assert.equal((await response.json()).route.status,'in_progress');
  const update=db.calls[1].methods.find(m=>m[0]==='update')[1];assert.equal('status' in update,false);assert.equal('published_at' in update,false);assert.equal(update.public_itinerary.length,1);assert.equal(update.end_city,'Little River');
  assert.ok(db.calls[1].methods.some(m=>m[0]==='eq'&&m[1]==='store_id'&&m[2]===storeId));assert.ok(db.calls[1].methods.some(m=>m[0]==='eq'&&m[1]==='updated_at'&&m[2]===version));assert.equal(db.calls.some(c=>c.table==='pickup_requests'||c.table==='pickup_route_stops'),false);
});
test('closed routes and stale versions cannot be edited',async()=>{
  for(const existing of [{status:'completed',updated_at:version},{status:'cancelled',updated_at:version},{status:'in_progress',updated_at:'newer-version'}]) {
    const db=database([{table:'pickup_routes',value:{data:existing}}]);const {PATCH}=load(routePath,db);assert.equal((await PATCH(patchRequest())).status,409);assert.equal(db.calls.length,1);
  }
});
test('route removal saves an empty itinerary without deleting customer records',async()=>{
  const db=database([{table:'pickup_routes',value:{data:{id,status:'in_progress',updated_at:version}}},{table:'pickup_routes',value:{data:{id,status:'in_progress',public_itinerary:[]}}}]);const {PATCH}=load(routePath,db);assert.equal((await PATCH(patchRequest({public_itinerary:[]}))).status,200);
  const update=db.calls[1].methods.find(m=>m[0]==='update')[1];assert.equal(update.start_city,null);assert.equal(update.end_city,null);assert.equal(db.calls.some(c=>c.methods.some(m=>m[0]==='delete')),false);
});
test('route edits reject duplicates and concurrent updates instead of reporting success',async()=>{
  let db=database([{table:'pickup_routes',value:{data:{id,status:'published',updated_at:version}}}]);let api=load(routePath,db);assert.equal((await api.PATCH(patchRequest({public_itinerary:[group,group]}))).status,400);
  db=database([{table:'pickup_routes',value:{data:{id,status:'in_progress',updated_at:version}}},{table:'pickup_routes',value:{data:null}}]);api=load(routePath,db);assert.equal((await api.PATCH(patchRequest())).status,409);
});
test('clearing announced cities does not republish customer cities as a fallback',async()=>{
  const db=database([{table:'stores',value:{data:{id:storeId,module_pickups_enabled:true}}},{table:'pickup_service_settings',value:{data:{}}},{table:'pickup_routes',value:{data:[{id,name:'Cleared',route_date:'2099-10-26',status:'in_progress',public_itinerary_managed:true,public_itinerary:[],pickup_route_stops:[{stop_order:1,pickup_requests:{city:'Conway'}}]}]}},{table:'pickup_zone_cities',value:{data:[]}}]);
  const {GET}=load('app/api/pickups/routes/public/route.ts',db);const r=await GET(new NextRequest('https://example.test/api/pickups/routes/public?store=yoyo-envios'));assert.equal((await r.json()).routes[0].cities.length,0);
});
