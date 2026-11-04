import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(path,deps={}){const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;vm.runInNewContext(source,{module,exports:module.exports,require:n=>n in deps?deps[n]:require(n)});return module.exports;}
const nav=load('lib/admin/nav-config.ts');
const accordion=load('components/admin/nav/AdminNavAccordion.tsx',{'@/lib/admin/nav-config':nav});
const store={slug:'alvarez-travel',module_store_enabled:true,module_shipping_enabled:true};
test('store sections combine analytics and reports without dropping links',()=>{
 const sections=nav.getVisibleAdminSections(store,false);assert.ok(sections.some(s=>s.title==='Tienda'));assert.equal(sections.some(s=>['Marketplace','Analítica','Reportes'].includes(s.title)),false);
 const links=sections.find(s=>s.title==='Analíticas').links.map(l=>l.href);assert.ok(links.includes('/admin/analytics'));assert.ok(links.includes('/admin/reportes/productos-mas-vendidos'));
 const withoutStore=nav.getVisibleAdminSections({...store,module_store_enabled:false},false);assert.equal(withoutStore.flatMap(s=>s.links).some(l=>l.href==='/admin/reportes/productos-mas-vendidos'),false);
});
test('all commercial marketing combinations retain their individual module gates inside one group',()=>{
 for(let mask=0;mask<8;mask++){
 const s={...store,module_marketing_posts_enabled:!!(mask&1),module_marketing_catalogs_enabled:!!(mask&2),module_marketing_analytics_enabled:!!(mask&4)};
 const sections=nav.getVisibleAdminSections(s,false);assert.equal(sections.filter(g=>g.title.startsWith('Marketing')).length,1);const links=sections.find(g=>g.title==='Marketing').links;
 for(const [bit,path] of [[1,'posts'],[2,'catalogs'],[4,'analytics']])assert.equal(links.some(l=>l.href==='/admin/marketing/commercial/'+path),!!(mask&bit));
 }
});
test('active link chooses most specific path and ignores similar prefixes',()=>{
 const links=nav.getVisibleAdminSections(store,true).flatMap(s=>s.links);
 assert.equal(nav.activeAdminHref(links,'/admin/products/resenas'),'/admin/products/resenas');assert.equal(nav.activeAdminHref(links,'/admin/shipping/trips/abc'),'/admin/shipping/trips');assert.equal(nav.activeAdminHref(links,'/admin/products-fake'),null);
});
test('initial accordion opens only the current section with accessible controls, without changing the page',()=>{
 const sections=nav.getVisibleAdminSections(store,false);
 for(const path of ['/admin','/admin/shipping/trips','/admin/analytics']){
 const html=renderToStaticMarkup(React.createElement(accordion.AdminNavAccordion,{sections,pathname:path},sections.map(s=>React.createElement(accordion.AdminNavAccordionSection,{key:s.title,title:s.title},s.links.map(l=>React.createElement('a',{key:l.href,href:l.href},l.label))))));
 assert.equal((html.match(/aria-expanded="true"/g)||[]).length,1);assert.equal((html.match(/ hidden=""/g)||[]).length,sections.length-1);assert.ok(html.includes('aria-controls='));assert.ok(html.includes('type="button"'));
 }
});
test('grouping does not mutate source sections or duplicate links across renders',()=>{
 const before=JSON.stringify(nav.adminNavSections);for(let i=0;i<5;i++)nav.getVisibleAdminSections(store,true);assert.equal(JSON.stringify(nav.adminNavSections),before);
 const links=nav.getVisibleAdminSections(store,true).flatMap(s=>s.links.map(l=>l.href));assert.equal(new Set(links).size,links.length);
});
