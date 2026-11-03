import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,deps={}){const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;vm.runInNewContext(source,{module,exports:module.exports,require:n=>{if(!(n in deps))throw Error(n);return deps[n]},URL,process});return module.exports;}
const meta=load('lib/saas/store-metadata.ts');
const urls=load('lib/storefront/item-public-url.ts',{'@/lib/saas/store-metadata':meta});
const pricing=load('lib/storefront/product-quantity-pricing.ts');
const store={id:'store-1',name:'Tienda',slug:'tienda',domain:'tienda.example',subdomain:'tienda',has_landing:true,is_active:true,platform_fee_enabled:true,platform_fee_percent:2.5};
test('URL propia, subdominio, tienda sin landing y dominio central',()=>{
 assert.equal(urls.getItemPublicUrl(store,'item','combos'),'https://tienda.example/tienda/combos/item');
 assert.equal(urls.getItemPublicUrl({...store,has_landing:false},'item','producto'),'https://tienda.example/producto/item');
 assert.equal(urls.getItemPublicUrl({...store,domain:null},'item','combos'),'https://tienda.perlamarketplace.com/tienda/combos/item');
 assert.equal(urls.getItemPublicUrl({...store,domain:null,subdomain:null},'item','producto'),'https://perlamarketplace.com/tienda/tienda/producto/item');
});
function combos(s,item,calls){return load('lib/storefront/combo-metadata.ts',{'@/lib/services/stores':{getStoreBySlug:async()=>s},'@/lib/services/combos':{getPublicComboById:async(...args)=>{calls.push(args);return {data:item}}},'@/lib/saas/store-metadata':meta,'@/lib/storefront/item-public-url':urls,'@/lib/storefront/product-quantity-pricing':pricing});}
test('combo usa su foto, precio con fee y consulta acotada a la tienda',async()=>{
 const calls=[];const {generateComboMetadata}=combos(store,{name:'Combo Express',price:20,description:'Alimentos',image_url:'https://assets.example/combo.jpg'},calls);
 const m=await generateComboMetadata({params:Promise.resolve({slug:'tienda',id:'combo-1'})});
 assert.equal(m.openGraph.images[0].url,'https://assets.example/combo.jpg');assert.match(m.openGraph.title,/20.50 USD/);assert.match(m.description,/Precio: 20.50 USD/);assert.equal(m.twitter.images[0],m.openGraph.images[0].url);assert.equal(JSON.stringify(calls),JSON.stringify([['combo-1','store-1']]));
});
test('combo inexistente o tienda inactiva no publica metadatos de otro artículo',async()=>{
 const calls=[];let api=combos({...store,is_active:false},null,calls);const a=await api.generateComboMetadata({params:Promise.resolve({slug:'tienda',id:'x'})});assert.equal(calls.length,0);assert.equal(a.robots.index,false);
 api=combos(store,null,calls);const b=await api.generateComboMetadata({params:Promise.resolve({slug:'tienda',id:'x'})});assert.equal(b.robots.index,false);
});
test('producto usa imagen principal y precio final en la vista previa',async()=>{
 const calls=[];const product={name:'Café',price:10,description:'Molido',image_url:'https://assets.example/old.jpg',product_images:[{image_url:'https://assets.example/main.jpg',is_main:true,position:2}]};
 const page=load('app/tienda/[slug]/producto/[id]/page.tsx',{'react':{cache:fn=>fn},'@/lib/saas/store-metadata':meta,'@/lib/storefront/item-public-url':urls,'@/lib/storefront/product-quantity-pricing':pricing,'@/lib/services/products':{getStoreProductById:async(...args)=>{calls.push(args);return {data:product}}},'@/lib/services/stores':{getStoreBySlug:async()=>store},'./ProductDetailClient':{}});
 const m=await page.generateMetadata({params:Promise.resolve({slug:'tienda',id:'product-1'})});assert.equal(m.openGraph.images[0].url,'https://assets.example/main.jpg');assert.match(m.openGraph.title,/10.25 USD/);assert.equal(JSON.stringify(calls),JSON.stringify([['product-1','store-1']]));
});
