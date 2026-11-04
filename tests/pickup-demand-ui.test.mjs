import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const path='app/admin/(store)/pickups/page.tsx';
const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const base={phone:'17725550100',city:'Ciudad de prueba',address_line_1:'Dirección de prueba',postal_code:'00000',package_count:2,estimated_weight:null,created_at:new Date().toISOString(),assigned_zone_id:null,suggested_zone_id:null,preferred_dates:[],zone:null,address_verified:true,latitude:1,longitude:1};
const fixture=[{...base,id:'a',request_code:'REC-A',customer_name:'Cliente pendiente',status:'new'},{...base,id:'b',request_code:'REC-B',customer_name:'Cliente cancelado',status:'cancelled'},{...base,id:'c',request_code:'REC-C',customer_name:'Cliente en ruta',status:'en_route'},{...base,id:'d',request_code:'REC-D',customer_name:'Cliente recogido',status:'picked_up'}];
export function renderDemand({storeId='store-wf',view='pending',selected=[],rows=fixture,search='',zoneFilter='all'}={}){
 let index=0;const changes=[];const initial=[rows,[],false,'','',search,zoneFilter,view,selected,null,null,'El cliente canceló','',false];
 const hooks={...React,useEffect:()=>{},useMemo:fn=>fn(),useRef:()=>({current:null}),useState:()=>{const current=index++;return [initial[current],value=>changes.push([current,value])];}};
 const module={exports:{}};
 const mocks={react:hooks,'next/link':({href,children,...props})=>React.createElement('a',{href,...props},children),'./pickups.module.css':{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})},'@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:null}})}}},'@/hooks/useStore':{useStore:()=>({store:{id:'unrelated-selected-store'},loading:false})},'@/hooks/useAdminAccess':{useAdminAccess:()=>({store:{id:storeId,name:'Agencia de prueba'},isSuperAdmin:false,loading:false})},'@/lib/utils/whatsapp':{openWhatsAppMessage:()=>{}},'@/components/pickups/ManualPickupStopModal':()=>null};
 vm.runInNewContext(source,{module,exports:module.exports,require:name=>name in mocks?mocks[name]:require(name),console,Date,Set,Map,requestAnimationFrame:fn=>fn()});
 const tree=module.exports.default();return {tree,html:renderToStaticMarkup(tree),changes};
}
function walk(node,visit){if(!node||typeof node!=='object')return;visit(node);React.Children.forEach(node.props?.children,child=>walk(child,visit));}
test('shared demand page shows a real single-column list and planning sidebar for every tenant',()=>{for(const storeId of ['store-wf','store-yoyo','store-alvarez']){const {html}=renderDemand({storeId});assert.match(html,/Resumen de demanda/);assert.match(html,/Prepara una ruta/);assert.match(html,/Cliente pendiente/);assert.doesNotMatch(html,/Cliente cancelado|Cliente en ruta|Cliente recogido/);assert.match(html,/<button[^>]*disabled[^>]*class="routeButton"/);assert.match(html,/Asigna una zona/);}});
test('route links include selected eligible requests only',()=>{const {html}=renderDemand({selected:['a','b','c','d','foreign-request']});assert.match(html,/href="\/admin\/pickups\/routes\/new\?requests=a"/);assert.doesNotMatch(html,/requests=a,b|requests=foreign/);assert.match(html,/Asignar zona a las solicitudes seleccionadas/);});
test('all lifecycle tabs preserve their own requests and reactivation action',()=>{for(const [view,name] of [['scheduled','Cliente en ruta'],['cancelled','Cliente cancelado'],['completed','Cliente recogido']]){const {html}=renderDemand({view});assert.match(html,new RegExp(name));assert.doesNotMatch(html,/Cliente pendiente/);if(view==='cancelled')assert.match(html,/Reactivar/);}});
test('search and zone filters still narrow requests and expose a reset state',()=>{assert.doesNotMatch(renderDemand({search:'not-a-client'}).html,/Cliente pendiente/);assert.match(renderDemand({search:'not-a-client'}).html,/Limpiar filtros/);assert.match(renderDemand({zoneFilter:'unassigned'}).html,/Cliente pendiente/);});
test('assign-zone shortcut selects pending unassigned requests, not cancelled or scheduled ones',()=>{const {tree,changes}=renderDemand();let target;walk(tree,node=>{if(node.type==='button'&&node.props.children?.[0]==='Asignar zona')target=node;});assert.ok(target);target.props.onClick();const selected=changes.find(([i])=>i===8)[1];assert.equal(JSON.stringify(selected),JSON.stringify(['a']));});
