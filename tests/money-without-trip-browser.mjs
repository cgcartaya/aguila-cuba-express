import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const browserRequire = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? createRequire(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/package.json`) : require;
const qaRequire = process.env.PRINT_QA_NODE_MODULES ? createRequire(`${process.env.PRINT_QA_NODE_MODULES}/package.json`) : require;
const { chromium } = browserRequire('playwright');
const esbuild = qaRequire('esbuild');
const stubs = {
  'next/link': `export default function Link({children,...props}){return <a {...props}>{children}</a>}`,
  'next/navigation': `export function useSearchParams(){return new URLSearchParams(window.fixture.search)}; export function useRouter(){return {push:path=>window.fixture.navigation=path,refresh:()=>{}}}`,
  '@/hooks/useAdminAccess': `export function useAdminAccess(){return {loading:false,isSuperAdmin:false,store:window.fixture.store,access:{profile:{id:'user'}}}}`,
  '@/hooks/useStore': `export function useStore(){return {loading:false,store:null}}`,
  '@/lib/services/shipping': `export async function getShippingDriversByStoreId(){return {data:[{id:'driver',name:'Repartidor de prueba',is_active:true}]}}; export async function createShipment(store,input){window.fixture.saved=input;return {data:{id:'created',order_number:1,...input},error:null}}`,
  '@/lib/services/shipping-settings': `export async function getShippingConfiguration(){return window.fixture.config}`,
  '@/lib/services/shipping-trips': `export async function getOpenShippingTripsByStoreId(){return {data:window.fixture.trips,error:null}};export async function getShippingTripById(store,id){return {data:window.fixture.requestedTrip||window.fixture.trips.find(t=>t.id===id)||null,error:null}}`,
  '@/components/admin/shipping/CustomerRecipientPicker': `export default function Picker({onApply}){return <button type="button" onClick={()=>onApply({customer_id:'customer',recipient_id:'recipient',sender_name:'Cliente',sender_phone:'5550101',recipient_name:'Destinatario',recipient_phone:'5550100',recipient_address:'Dirección de prueba',country_id:'c'})}>Seleccionar cliente de prueba</button>}`,
};
const bundle = await esbuild.build({ stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Page from './app/admin/(store)/shipping/new/page';createRoot(document.getElementById('root')).render(<Page/>);`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixtures',setup(build){
  build.onResolve({filter:/^(next\/|@\/)/},args=>stubs[args.path]?{path:args.path,namespace:'stub'}:args.path.startsWith('@/')?{path:path.resolve(process.cwd(),args.path.slice(2)+(path.extname(args.path)?'':args.path.startsWith('@/components/')?'.tsx':'.ts'))}:null);
  build.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:process.cwd()}));
}}] });
const config={settings:{money_include_principal:true,money_fixed_fee_below:100,money_fixed_fee:10,money_threshold:1000,money_rate_below_threshold:10,money_rate_at_or_above_threshold:5},countries:[{id:'c',name:'Cuba',is_active:true}],provinces:[],municipalities:[],locations:[],serviceTypes:[{id:'service',code:'EXPRESS',name:'Express',is_active:true}],rates:[{id:'rate',service_type_id:'service',scope_type:'country',country_id:'c',rate_per_lb:6,is_active:true}],extraFees:[]};
const trip={id:'trip',trip_number:1,name:'Salida de prueba',status:'preparing',is_active:true,is_default:true,transport_mode:'air'};
const browser=await chromium.launch({headless:true,executablePath:process.env.PRINT_QA_CHROMIUM||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
async function start({trips=[],search='',requestedTrip=null}={}){
 const page=await browser.newPage();await page.setContent('<html><body><div id="root"></div></body></html>');await page.evaluate(f=>window.fixture=f,{store:{id:'agency',name:'Agencia'},trips,search,requestedTrip,config});await page.addScriptTag({content:bundle.outputFiles[0].text});await page.getByRole('heading',{name:'¿Qué deseas registrar?'}).waitFor();return page;
}
async function registerMoney(page){
 await page.getByRole('button',{name:/Envío de dinero/}).click();
 await page.getByRole('button',{name:'Seleccionar cliente de prueba'}).click();
 await page.getByLabel('Monto enviado',{exact:true}).fill('100');
 await page.getByText('Repartidor',{exact:true}).locator('..').locator('select').selectOption('driver');
 const statuses=await page.getByText('Estado',{exact:true}).locator('..').locator('select').locator('option').allTextContents();assert.deepEqual(statuses.filter(s=>s!=='Seleccionar'),['Pendiente de entrega','En reparto','Entregado','Incidencia']);
 await page.getByText('Estado',{exact:true}).locator('..').locator('select').selectOption('out_for_delivery');
 await page.getByRole('button',{name:'Crear operación'}).click();await page.waitForFunction(()=>Boolean(window.fixture.saved));
 const f=await page.evaluate(()=>window.fixture);assert.equal(f.saved.trip_id,null);assert.equal(f.saved.contains_package,false);assert.equal(f.saved.contains_money,true);assert.equal(f.saved.money_amount,100);assert.equal(f.saved.money_total,110);assert.equal(f.saved.assigned_staff_id,'driver');assert.equal(f.saved.status,'out_for_delivery');assert.ok(f.navigation.startsWith('/admin/shipping/shipments?content=money'));
}
try {
 const noTrips=await start();assert.equal(await noTrips.getByRole('button',{name:'Crear operación'}).isDisabled(),true);await registerMoney(noTrips);await noTrips.close();
 const defaultTrip=await start({trips:[trip]});await registerMoney(defaultTrip);await defaultTrip.close();
 const closedTrip=await start({search:'tripId=closed&type=money',requestedTrip:{...trip,id:'closed',status:'completed'}});await registerMoney(closedTrip);await closedTrip.close();
 const packagePage=await start({trips:[trip]});await packagePage.getByRole('button',{name:'Seleccionar cliente de prueba'}).click();await packagePage.getByText('Tipo de paquete',{exact:true}).locator('..').locator('select').selectOption('service');await packagePage.getByLabel('Peso (lb)',{exact:true}).fill('10');await packagePage.getByRole('button',{name:'Crear operación'}).click();await packagePage.waitForFunction(()=>Boolean(window.fixture.saved));assert.equal(await packagePage.evaluate(()=>window.fixture.saved.trip_id),'trip');await packagePage.close();
 const mixed=await start({trips:[trip]});await mixed.getByRole('button',{name:/Paquete y dinero/}).click();await mixed.getByRole('button',{name:'Seleccionar cliente de prueba'}).click();await mixed.getByText('Tipo de paquete',{exact:true}).locator('..').locator('select').selectOption('service');await mixed.getByLabel('Peso (lb)',{exact:true}).fill('10');await mixed.getByLabel('Monto enviado',{exact:true}).fill('100');await mixed.getByRole('button',{name:'Crear operación'}).click();await mixed.waitForFunction(()=>Boolean(window.fixture.saved));const mixedSaved=await mixed.evaluate(()=>window.fixture.saved);assert.equal(mixedSaved.trip_id,'trip');assert.equal(mixedSaved.contains_money,true);assert.equal(mixedSaved.contains_package,true);assert.equal(mixedSaved.service_price,170);await mixed.close();
 const switching=await start();await switching.getByRole('button',{name:/Envío de dinero/}).click();await switching.getByRole('button',{name:'Seleccionar cliente de prueba'}).click();await switching.getByLabel('Monto enviado',{exact:true}).fill('25');await switching.locator('button[aria-pressed]').nth(0).click();assert.equal(await switching.getByRole('button',{name:'Crear operación'}).isDisabled(),true);await switching.getByRole('button',{name:/Envío de dinero/}).click();assert.equal(await switching.getByLabel('Monto enviado',{exact:true}).inputValue(),'25');await switching.close();
 console.log('Browser: money without trips, default trip ignored, closed requested trip bypassed, package with trip and preserved draft verified.');
} finally {await browser.close()}
