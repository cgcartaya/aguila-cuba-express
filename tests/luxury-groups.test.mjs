import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const rows = JSON.parse(fs.readFileSync('components/landing/luxury/groups.json','utf8'));
const mod = {exports:{}};
const source=fs.readFileSync('components/landing/luxury/GroupExplorer.tsx','utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module:mod,exports:mod.exports,Intl,Date,require:name=>name==='./i18n'?{useLuxuryLanguage:()=>({language:'es'}),translateTree:node=>node}:name==='./groups.json'?rows:name==='./content'?{whatsapp:message=>'https://wa.me/12392657294?text='+encodeURIComponent(message)}:name.endsWith('.css')?new Proxy({},{get:(_,k)=>String(k)}):require(name)});
const filter=mod.exports.filterGroups;
test('combined country/month/year/from-date filters only return matching departures',()=>{
 const sample=rows.find(g=>g.countries.includes('Japón'));
 const result=filter('Japón',sample.date.slice(5,7),sample.date.slice(0,4),sample.date,'date');
 assert.ok(result.length>0);
 for(const g of result){assert.ok(g.countries.includes('Japón'));assert.equal(g.date.slice(5,7),sample.date.slice(5,7));assert.equal(g.date.slice(0,4),sample.date.slice(0,4));assert.ok(g.date>=sample.date);}
 assert.equal(filter('No existe','','','','date').length,0);
});
test('sorting is numeric, complete and does not mutate the catalogue',()=>{
 const original=rows.map(g=>g.id).join(',');
 for(const [order,key] of [['price','price'],['days','days'],['date','date']]){
  const result=filter('','','','',order);assert.equal(result.length,30);
  for(let i=1;i<result.length;i++) assert.ok(result[i-1][key]<=result[i][key]);
 }
 assert.equal(rows.map(g=>g.id).join(','),original);
});
test('catalogue renders 30 actionable cards with local images and no invented PDF links',()=>{
 const html=renderToStaticMarkup(require('react').createElement(mod.exports.default));
 assert.match(html,/30 grupos encontrados/);assert.match(html,/Solicita el depósito/);
 assert.equal((html.match(/Ver circuito e inclusiones/g)||[]).length,30);
 assert.equal(new Set(rows.map(g=>g.id)).size,30);
 for(const g of rows){assert.ok(fs.existsSync('public'+g.image));assert.ok(g.includes.length>=1);assert.equal(g.pdf,null);assert.match(g.date,/^\d{4}-\d{2}-\d{2}$/);}
 assert.doesNotMatch(html,/href="[^"]+\.pdf/);
});
