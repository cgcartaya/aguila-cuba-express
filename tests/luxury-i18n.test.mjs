import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { travelTypes, legacyPackages } from './helpers/luxury-fixtures.mjs';
const require=createRequire(import.meta.url);
const base='components/landing/luxury/';
function load(name,deps={},root=base) {
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module:mod,exports:mod.exports,Intl,Date,URL,require:n=>deps[n]??(n==='./translations.json'?JSON.parse(fs.readFileSync(base+'translations.json','utf8')):require(n))});
 return mod.exports;
}
const i18n=load('i18n.tsx');
const css=new Proxy({},{get:(_,key)=>String(key)});
function localizedPage(language){
 const deps={'@/lib/travel/types':travelTypes,'./i18n':{...i18n,useLuxuryLanguage:()=>({language,setLanguage:()=>{}})},'./luxury.module.css':css,'./content':load('content.ts'),'./groups.json':JSON.parse(fs.readFileSync(base+'groups.json','utf8'))};
 deps['./dmc.module.css']=css;
 deps['@/lib/luxury/hosts']=load('hosts.ts',{},'lib/luxury/');
 deps['@/lib/luxury/dmc/content']=load('content.ts',{},'lib/luxury/dmc/');
 deps['./LuxuryPickup']={default:()=>null,__esModule:true};
 deps['@/lib/luxury/shipping']=load('shipping.ts',{},'lib/luxury/');
 deps['@/lib/shipping/weight-rate']=load('weight-rate.ts',{},'lib/shipping/');
 deps['./commercial-copy']=load('commercial-copy.ts',deps);
 deps['./ShippingQuoters']=load('ShippingQuoters.tsx',deps);
 deps['./LuxuryShipping']=load('LuxuryShipping.tsx',deps);
 for(const name of ['LanguageSelector','HeroGallery','PackageDetail','GroupExplorer','TravelExplorer'])deps['./'+name]=load(name+'.tsx',deps);
 const seed=fs.readFileSync('supabase/migrations/20261111162000_luxury_shipping_catalog.sql','utf8').split('$seed$')[1];
 const shipping={entries:JSON.parse(seed).filter(row=>row.section!=='promotion'),whatsapp:'https://wa.me/12395550100'};
 return renderToStaticMarkup(React.createElement(load('LuxuryLanding.tsx',deps).default,{packages:legacyPackages,shipping}));
}
test('English and French render locally without scripts or external translation requests',()=>{
 const en=localizedPage('en'),fr=localizedPage('fr');
 assert.match(en,/href="\/en\/mice-events"/);assert.match(en,/href="\/en\/our-services"/);assert.match(en,/href="\/en\/destinations"/);
 assert.match(en,/The world awaits/);assert.match(en,/All countries/);assert.match(en,/Frequently asked questions/);assert.match(en,/Monday–Saturday: 10 a.m.–6 p.m./);
 assert.match(en,/15 × 15 × 15 gold box/);assert.match(en,/Track CM…AP code/);assert.match(en,/Estimate your shipment/);
 assert.match(fr,/Boîte dorée 15 × 15 × 15/);assert.match(fr,/Suivre le code TRE/);
 for (const html of [en,fr]) {
  assert.match(html,/wa\.me\/12395550100\?text=/);
  assert.match(html,/https:\/\/billetera\.cc\/cobertura/);
  assert.doesNotMatch(html,/Cajas completas|3\.49|javascript:|We are by your side|Your way to travel|DMC IN THE UNITED STATES/);
 }
 assert.match(fr,/Le monde vous attend/);assert.match(fr,/Tous les pays/);assert.match(fr,/Questions fréquentes/);assert.match(fr,/Du lundi au samedi : 10 h–18 h/);
 for(const html of [en,fr]){assert.doesNotMatch(html,/translate\.google|translate_a|luxuryTranslateInit/);assert.match(html,/value="Japón"/);assert.match(html,/value="2027"/);assert.match(html,/sales@luxurytravelpoint.com/);}
});
test('translated labels preserve option values, input values, URLs and event callbacks',()=>{
 const callback=()=>{};
 const tree=React.createElement('select',{onChange:callback,value:'Japón'},React.createElement('option',null,'Japón'));
 const translated=i18n.translateTree(tree,'en');
 assert.equal(translated.props.onChange,callback);assert.equal(translated.props.value,'Japón');
 assert.equal(translated.props.children.props.value,'Japón');assert.equal(translated.props.children.props.children,'Japan');
 const input=i18n.translateTree(React.createElement('input',{value:'Carlos',placeholder:'Tu nombre'}),'fr');
 assert.equal(input.props.value,'Carlos');assert.equal(input.props.placeholder,'Votre nom');
 const link=i18n.translateTree(React.createElement('a',{href:'https://wa.me/12392657294?text=Hola'},'Consultar'),'en');assert.equal(link.props.href,'https://wa.me/12392657294?text=Hola');
});
test('Spanish stays unchanged, mixed country lists translate and travel facts retain their amounts',()=>{
 assert.equal(i18n.translateText('  Japón  ','es'),'  Japón  ');
 assert.equal(i18n.translateText('Japón · Corea del Sur','fr'),'Japon · Corée du Sud');
 assert.equal(i18n.translateText('6 o más personas','en'),'6 or more people');
 assert.match(i18n.translateText('Visado a China: USD 150 por persona.','fr'),/150 USD/);
 assert.equal(i18n.translateText('An unknown proper name','en'),'An unknown proper name');
});

test('language switching preserves child keys so catalogue controls keep their state',()=>{
 const tree=[React.createElement('select',{key:'country',value:'Japón'}),React.createElement('section',{key:'catalog'})];
 const translated=i18n.translateTree(tree,'en');
 assert.equal(translated[0].key,tree[0].key);assert.equal(translated[1].key,tree[1].key);
 assert.equal(i18n.translateText(' viajes encontrados','en'),' trips found');
});
