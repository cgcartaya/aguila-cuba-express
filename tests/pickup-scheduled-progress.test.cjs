const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/pickups/scheduled-progress.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,Intl,Date});
const {getScheduledProgress:progress,progressNames,scheduleTimezone}=mod.exports;
const names=['Georgetown','Goose Creek','Summerville','Charleston','Okatie','Beaufort'];
const times=[['07:29','09:30'],['10:30','11:30'],['11:45','12:45'],['13:00','14:30'],['15:30','16:30'],['16:45','17:30']];
const route={route_date:'2026-10-24',cities:names.map((name,i)=>({name,start_time:times[i][0],end_time:times[i][1]}))};
const at=(iso,r=route,zone='America/New_York')=>progress(r,new Date(iso),zone);
const arr=v=>Array.from(v);
test('12:10 SC highlights Summerville, not the first city, regardless of visitor timezone',()=>{
 const p=at('2026-10-24T16:10:00Z');assert.equal(p.phase,'stop');assert.deepEqual(arr(p.currentIndices),[2]);assert.deepEqual(arr(p.previousIndices),[0,1]);assert.deepEqual(arr(p.nextIndices),[3]);assert.equal(p.localTime,'12:10 PM');assert.equal(progressNames(route.cities,p.currentIndices),'Summerville');
});
test('between cities interpolates only within the published gap',()=>{
 const p=at('2026-10-24T16:52:30Z');assert.equal(p.phase,'transit');assert.equal(p.fromIndex,2);assert.equal(p.toIndex,3);assert.equal(p.fraction,.5);assert.deepEqual(arr(p.currentIndices),[]);
 assert.equal(at('2026-10-24T16:45:00Z').fraction,0);assert.equal(at('2026-10-24T17:00:00Z').phase,'stop');
});
test('future dates and before-start never invent a current vehicle location',()=>{
 for(const date of ['2026-10-23T16:10:00Z','2026-10-24T11:00:00Z']) {const p=at(date);assert.equal(p.phase,'upcoming');assert.deepEqual(arr(p.currentIndices),[]);assert.equal(p.fromIndex,null);}
});
test('end and stale previous dates finish the schedule without changing route status',()=>{
 for(const date of ['2026-10-24T21:30:00Z','2026-10-25T01:30:00Z','2026-10-25T16:10:00Z']){const p=at(date);assert.equal(p.phase,'finished');assert.equal(p.previousIndices.length,6);assert.equal(p.currentIndices.length,0);}
 assert.equal(route.cities.length,6);
});
test('shared time windows highlight all grouped cities without claiming an exact one',()=>{
 const r={route_date:'2026-10-24',cities:[{name:'North Myrtle Beach',start_time:'09:30',end_time:'11:30'},{name:'Little River',start_time:'09:30',end_time:'11:30'},{name:'Conway',start_time:'12:00',end_time:'13:00'}]};
 const p=at('2026-10-24T14:10:00Z',r);assert.deepEqual(arr(p.currentIndices),[0,1]);assert.equal(progressNames(r.cities,p.currentIndices),'North Myrtle Beach / Little River');
});
test('missing, reversed, malformed and overlapping schedules stay neutral',()=>{
 for(const cities of [[],[{name:'X'}],[{name:'X',start_time:'25:00',end_time:'26:00'}],[{name:'X',start_time:'09:00',end_time:'08:00'}],[route.cities[0],{name:'X',start_time:'09:00',end_time:'10:00'}],[route.cities[0],{name:'X'}]]) assert.equal(at('2026-10-24T16:10:00Z',{...route,cities}).phase,'unavailable');
});
test('adjacent windows move directly to the next stop at the boundary',()=>{
 const r={...route,cities:[{name:'A',start_time:'09:00',end_time:'10:00'},{name:'B',start_time:'10:00',end_time:'11:00'}]};assert.deepEqual(arr(at('2026-10-24T14:00:00Z',r).currentIndices),[1]);
});
test('timezone day and daylight savings use IANA rules; invalid settings fall back safely',()=>{
 assert.equal(at('2026-10-24T02:00:00Z').phase,'upcoming');
 const winter={route_date:'2026-12-10',cities:route.cities};assert.deepEqual(arr(at('2026-12-10T17:10:00Z',winter).currentIndices),[2]);
 assert.equal(scheduleTimezone('invalid'),'America/New_York');assert.equal(at('2026-10-24T16:10:00Z',route,'invalid').phase,'stop');
});
