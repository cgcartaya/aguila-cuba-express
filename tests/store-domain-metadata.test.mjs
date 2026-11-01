import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module={exports:{}};
const source=ts.transpileModule(fs.readFileSync('lib/saas/store-metadata.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(source,{module,exports:module.exports,URL,process});
const api=module.exports;
const store={id:'alvarez',name:'Álvarez Travel',slug:'alvarez-travel',domain:'alvarez-travel.com',subdomain:'alvarez-travel',has_landing:true,favicon_url:'https://assets.example/favicon.png',logo_url:null,og_image_url:'https://assets.example/landing.png',store_og_image_url:'https://assets.example/store.png'};
test('Álvarez canonical uses the apex domain and public storefront path',()=>{
 assert.equal(api.getStorePublicBaseUrl(store),'https://alvarez-travel.com');
 assert.equal(api.getStorefrontCanonicalUrl(store),'https://alvarez-travel.com/tienda');
 assert.equal(api.getStorePublicBaseUrl({...store,domain:'other-agency.com'}),'https://other-agency.com');
});
test('tracking and invoices inherit tenant favicon and keep private documents unindexed',()=>{
 const tracking=api.buildStoreTrackingMetadata(store,'https://alvarez-travel.com/rastrear');
 assert.equal(tracking.icons.icon[0].url,store.favicon_url);
 assert.equal(tracking.openGraph.images[0].url,store.og_image_url);
 const invoice=api.buildStoreShippingInvoiceMetadata(store,'https://alvarez-travel.com/factura/ACE-12345678','ACE-12345678');
 assert.equal(invoice.icons.icon[0].url,store.favicon_url);
 assert.equal(invoice.robots.index,false);
});
