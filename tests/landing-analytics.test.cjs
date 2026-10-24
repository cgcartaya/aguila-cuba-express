const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {NextRequest,NextResponse}=require('next/server');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/analytics/landing-summary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,Date,Intl,Set,Map});
const {landingWindow,summarizeLanding}=mod.exports;
const plain=x=>JSON.parse(JSON.stringify(x));
const now=new Date('2026-10-24T16:47:00Z');
test('calendar month is October 1 through today in SC, not the last 30 days',()=>{
 const w=landingWindow('this_month',now,'America/New_York');assert.equal(w.start,'2026-10-01T04:00:00.000Z');assert.equal(w.end,now.toISOString());assert.equal(w.startDate,'2026-10-01');assert.equal(w.endDate,'2026-10-24');assert.equal(summarizeLanding([],w).daily.length,24);
});
test('previous month and rolling days use calendar dates and exclude future days',()=>{
 const last=landingWindow('last_month',now);assert.equal(last.start,'2026-09-01T04:00:00.000Z');assert.equal(last.end,'2026-10-01T04:00:00.000Z');assert.equal(last.endDate,'2026-09-30');
 assert.equal(landingWindow('7d',now).startDate,'2026-10-18');assert.equal(landingWindow('30d',now).startDate,'2026-09-25');
 const jan=landingWindow('last_month',new Date('2027-01-01T17:00:00Z'));assert.equal(jan.startDate,'2026-12-01');assert.equal(jan.endDate,'2026-12-31');
});
test('month boundaries follow DST and local date rather than UTC date',()=>{
 const nov=landingWindow('last_month',new Date('2026-12-10T17:00:00Z'));assert.equal(nov.start,'2026-11-01T04:00:00.000Z');assert.equal(nov.end,'2026-12-01T05:00:00.000Z');
 assert.equal(landingWindow('this_month',new Date('2026-11-01T02:00:00Z')).startDate,'2026-10-01');assert.equal(landingWindow('this_month',now,'invalid').timezone,'America/New_York');
});
test('period uniques differ from views and the sum of daily uniques',()=>{
 const rows=[{session_id:'s1',visitor_id:'v1',created_at:'2026-10-02T01:00:00Z'},{session_id:'s1',visitor_id:'v1',created_at:'2026-10-02T05:00:00Z'},{session_id:'s2',visitor_id:'v1',created_at:'2026-10-02T07:00:00Z'},{session_id:'s3',visitor_id:'v2',created_at:'2026-10-03T01:00:00Z'}];
 const p=summarizeLanding(rows,landingWindow('this_month',now));assert.deepEqual(plain(p.totals),{visits:3,views:4,visitors:2});assert.equal(p.daily[0].views,1);assert.equal(p.daily[1].visits,3);assert.equal(p.daily.reduce((n,d)=>n+d.visits,0),4);assert.equal(p.daily[3].views,0);
});
test('half-open bounds accept equivalent SQL timestamp formats and ignore absent identifiers',()=>{
 const rows=[{session_id:'before',visitor_id:'before',created_at:'2026-10-01T03:59:59Z'},{session_id:'first',visitor_id:'first',created_at:'2026-10-01 04:00:00+00'},{session_id:null,visitor_id:'',created_at:'2026-10-01T04:00:01Z'},{session_id:'end',visitor_id:'end',created_at:now.toISOString()}];
 assert.deepEqual(plain(summarizeLanding(rows,landingWindow('this_month',now)).totals),{views:2,visits:1,visitors:1});
});
function db(replies,user={id:'owner'}) {const calls=[];return {calls,auth:{getUser:async()=>({data:{user}})},from(table){const reply=replies.shift();assert.ok(reply,`unexpected ${table}`);assert.equal(table,reply.table);const call={table,ops:[]};calls.push(call);const b={};for(const op of ['select','eq','gte','lt','order','range'])b[op]=(...args)=>{call.ops.push([op,...args]);return b;};b.maybeSingle=()=>Promise.resolve(reply);b.then=(resolve,reject)=>Promise.resolve(reply).then(resolve,reject);return b;}};}
class FixedDate extends Date { constructor(...args){ super(...(args.length ? args : ['2026-10-24T16:47:00Z'])); } static now(){ return Date.parse('2026-10-24T16:47:00Z'); } }
function load(database){const module={exports:{}};const mocks={'next/server':{NextRequest,NextResponse},'@/lib/supabase-admin':{supabaseAdmin:database},'@/lib/analytics/landing-summary':mod.exports};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/analytics/landing/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>mocks[name],Date:FixedDate,console});return module.exports.GET;}
const id='772a5d87-b460-4e9a-bc97-e52425e1202f';
const req=(token='valid',extra='')=>new NextRequest(`https://example.test/api/analytics/landing?storeId=${id}${extra}`,{headers:token?{Authorization:`Bearer ${token}`}:{}});
test('anonymous, invalid, inactive and cross-tenant access never query analytics',async()=>{
 let d=db([]);assert.equal((await load(d)(req(''))).status,401);assert.equal(d.calls.length,0);
 d=db([]);assert.equal((await load(d)(req('valid','&period=all'))).status,400);
 d=db([],null);assert.equal((await load(d)(req())).status,401);
 d=db([{table:'profiles',data:{active:false,role:'store_owner'}}]);assert.equal((await load(d)(req())).status,403);
 d=db([{table:'profiles',data:{active:true,role:'store_owner'}},{table:'store_users',data:null}]);assert.equal((await load(d)(req())).status,403);assert.ok(d.calls[1].ops.some(x=>x[0]==='eq'&&x[1]==='store_id'&&x[2]===id));assert.ok(d.calls[1].ops.some(x=>x[0]==='eq'&&x[1]==='active'&&x[2]===true));
});
function granted(role='super_admin'){return [{table:'profiles',data:{active:true,role}},...(role==='super_admin'?[]:[{table:'store_users',data:{id:'membership'}}]),{table:'stores',data:{id}},{table:'pickup_service_settings',data:{timezone:'America/New_York'}}];}
test('landing API paginates beyond 1000, filters tenant/home/event/time and returns only aggregates',async()=>{
 const row={session_id:'session',visitor_id:'visitor',created_at:'2026-10-02T12:00:00Z'};
 const d=db([...granted('store_owner'),{table:'analytics_events',data:Array.from({length:1000},()=>row)},{table:'analytics_events',data:[{...row,session_id:'second',visitor_id:'second'}]}]);
 const r=await load(d)(req());assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');const p=await r.json();assert.equal(p.totals.views,1001);assert.equal(p.totals.visits,2);assert.equal(p.totals.visitors,2);assert.equal('session_id' in p,false);
 const queries=d.calls.filter(c=>c.table==='analytics_events');assert.deepEqual(queries.map(q=>q.ops.find(x=>x[0]==='range').slice(1)),[[0,999],[1000,1999]]);
 for(const q of queries){assert.ok(q.ops.some(x=>x[0]==='eq'&&x[1]==='store_id'&&x[2]===id));assert.ok(q.ops.some(x=>x[0]==='eq'&&x[1]==='path'&&x[2]==='/'));assert.ok(q.ops.some(x=>x[0]==='eq'&&x[1]==='event_name'&&x[2]==='page_view'));assert.ok(q.ops.some(x=>x[0]==='gte'&&x[1]==='created_at'));assert.ok(q.ops.some(x=>x[0]==='lt'&&x[1]==='created_at'));}
});
test('empty results are zero and database errors cannot masquerade as zero visits',async()=>{
 let d=db([...granted(),{table:'analytics_events',data:[]}]);let r=await load(d)(req());assert.equal(r.status,200);assert.deepEqual((await r.json()).totals,{visits:0,views:0,visitors:0});
 d=db([...granted(),{table:'analytics_events',data:null,error:new Error('database failure')}]);r=await load(d)(req());assert.equal(r.status,500);assert.equal('totals' in await r.json(),false);
});
test('volume guard reports an error instead of silently truncating the total',async()=>{
 const rows=Array.from({length:1000},()=>({session_id:'s',visitor_id:'v',created_at:'2026-10-02T12:00:00Z'}));
 const d=db([...granted(),...Array.from({length:51},()=>({table:'analytics_events',data:rows}))]);
 const r=await load(d)(req());assert.equal(r.status,422);assert.equal('totals' in await r.json(),false);
});
