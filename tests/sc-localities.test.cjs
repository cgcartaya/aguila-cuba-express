const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const upstream=require('country-state-city');
const source=JSON.parse(fs.readFileSync('lib/geo/data/south-carolina-places.json','utf8'));
const moduleRef={exports:{}};
const code=ts.transpileModule(fs.readFileSync('lib/geo/location-catalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
vm.runInNewContext(code,{module:moduleRef,exports:moduleRef.exports,require:name=>name.endsWith('.json')?source:require(name),Set});
const {getCityOptions}=moduleRef.exports;
const cities=getCityOptions('US','SC');

test('all Census 2026 SC places and the verified GNIS communities can be selected',()=>{
  assert.equal(source.places.filter(p=>p.source==='Census').length,475);
  for(const place of source.places) assert.ok(cities.some(c=>c.value===place.name),`missing ${place.name}`);
  for(const name of ['Okatie','Aynor','Pawleys Island','Carolina Forest','Longs','Johns Island','Wadmalaw Island','Daufuskie Island','Saint Helena Island','Pritchardville','McClellanville','Bucksport']) assert.ok(cities.some(c=>c.value===name),name);
});
test('catalog has no duplicate values, non-finite coordinates or counties masquerading as cities',()=>{
  const keys=cities.map(c=>c.value.trim().toLowerCase());assert.equal(new Set(keys).size,keys.length);
  assert.equal(cities.some(c=>/\sCounty$/i.test(c.label)),false);
  for(const c of cities){assert.ok(Number(c.latitude)>=32&&Number(c.latitude)<=35.3,c.label);assert.ok(Number(c.longitude)>=-83.5&&Number(c.longitude)<=-78.4,c.label);}
  const okatie=cities.find(c=>c.value==='Okatie');assert.ok(Math.abs(Number(okatie.latitude)-32.352145)<0.00001);assert.ok(Math.abs(Number(okatie.longitude)+80.978168)<0.00001);
});
test('valid existing names and other regions keep their previous values and coordinates',()=>{
  for(const base of upstream.City.getCitiesOfState('US','SC').filter(c=>!/\sCounty$/i.test(c.name))){
    const found=cities.find(c=>c.value===base.name);assert.ok(found,base.name);assert.equal(found.latitude,base.latitude);assert.equal(found.longitude,base.longitude);
  }
  for(const [country,state] of [['US','NC'],['CU','06']]){
    const seen=new Set();const expected=upstream.City.getCitiesOfState(country,state).filter(c=>{const key=c.name.trim().toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true;}).map(c=>({value:c.name,label:c.name,latitude:c.latitude,longitude:c.longitude})).sort((a,b)=>a.label.localeCompare(b.label));
    assert.equal(JSON.stringify(getCityOptions(country,state)),JSON.stringify(expected));
  }
});
const itinerary={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/pickups/itinerary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:itinerary,exports:itinerary.exports,Date,Intl,Set});
test('Okatie with SC suffix matches searches and map coordinates without duplicating a route city',()=>{
  const {cityKey,validateItinerary}=itinerary.exports;
  for(const name of ['Okatie','Okatie, SC','  Okatie, sc  ','Okatie, South Carolina'])assert.equal(cityKey(name),'okatie');
  const catalog=new Map(cities.map(c=>[cityKey(c.label),c]));assert.ok(catalog.get(cityKey('Okatie, SC')).latitude);
  assert.throws(()=>validateItinerary([{cities:['Okatie'],start_time:null,end_time:null},{cities:['Okatie, SC'],start_time:null,end_time:null}]));
});
console.log(JSON.stringify({previous:upstream.City.getCitiesOfState('US','SC').length,current:cities.length,removedCounties:upstream.City.getCitiesOfState('US','SC').filter(c=>/\sCounty$/i.test(c.name)).length,newNames:cities.filter(c=>!upstream.City.getCitiesOfState('US','SC').some(p=>p.name===c.value)).length}));
