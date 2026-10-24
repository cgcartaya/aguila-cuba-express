/* Local integration fixture: real Next routes + disposable Supabase HTTP fixture; no production writes/messages. */
const http=require('node:http'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const storeId='9c65e62c-6437-4a51-adde-d682d1b90659',userId='33333333-3333-4333-8333-333333333333',dishId='11111111-1111-4111-8111-111111111111';
const store={id:storeId,name:'Águila Express prueba',slug:'aguila',is_active:true,module_menu_enabled:true,module_store_enabled:true,module_shipping_enabled:true,logo_url:null,primary_color:'#061b3a',secondary_color:'#ef233c',currency:'USD'};
const item={id:dishId,store_id:storeId,category_id:'cat-one',name:'Completa de prueba',description:'Plato local de prueba',price:10,image_url:null,is_active:true,is_featured:false,sort_order:0,stock:null,daily_stock_enabled:false,manual_unavailable:false,available_dine_in:false,available_takeaway:false,available_delivery:true,delivery_paused_date:null,delivery_pause_reason:null,menu_item_option_groups:[]};
let state={store_id:storeId,config:{enabled:true,name:'Restaurante de prueba',logo_url:'',description:'Comida preparada con entrega propia.',accent:'#b45309',currency:'USD',delivery_note:'El restaurante confirma la entrega.',hours_note:'Horario de prueba',zones:[{id:'restaurant-zone',name:'Solo zona restaurante',fee:3,minimum_order:0}]},updated_at:'2026-10-24T12:00:00Z',currency_locked:true};
const writes=[];
const fixture=http.createServer(async(req,res)=>{
 res.setHeader('access-control-allow-origin','*');res.setHeader('access-control-allow-headers','*');res.setHeader('access-control-allow-methods','GET,POST,PATCH,DELETE,HEAD,OPTIONS');res.setHeader('access-control-expose-headers','content-range');
 if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 const url=new URL(req.url,'http://127.0.0.1:54329'),table=url.pathname.split('/').pop();let data=[],count=0;
 if(url.pathname.endsWith('/auth/v1/user'))data={id:userId,email:'owner@example.test',user_metadata:{}};
 else if(table==='profiles')data=[{id:userId,role:'store_owner',active:true,email:'owner@example.test'}];
 else if(table==='store_users')data=[{id:'member',user_id:userId,store_id:storeId,role:'OWNER',active:true,permissions:{},stores:store}];
 else if(table==='stores')data=(url.searchParams.has('domain')||url.searchParams.has('subdomain'))?[]:[store];
 else if(table==='store_settings')data=[{id:'settings',store_id:storeId,whatsapp:'+15555550123',menu_timezone:'America/Havana',menu_orders_paused:false,menu_show_usd_equivalent:false,order_notification_email:null,show_hero:false,show_featured_products:false,show_categories:false,show_combos:false,show_products:false}];
 else if(table==='store_restaurant_sections')data=[state];
 else if(table==='menu_categories')data=[{id:'cat-one',store_id:storeId,name:'Completas',venue_type:'restaurant',sort_order:0,is_active:true,menu_items:[item]}];
 else if(table==='menu_items'){data=[item];count=1;}
 else if(table==='checkout_settings')data=[{delivery_address_mode:'zones',blocks:{customer:false}}];
 else if(table==='delivery_zones')data=[{id:'SHOP-ZONE',municipality:'Tienda',zone_name:'NO USAR',delivery_fee:99,is_active:true}];
 if(['POST','PATCH','DELETE'].includes(req.method)){
  let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null;writes.push({table,method:req.method,body});
  if(table==='store_restaurant_sections'&&req.method==='PATCH'){
   if(url.searchParams.get('updated_at')!==`eq.${state.updated_at}`)data=[];
   else{state={...state,...body};data=[state];}
  }else if(table==='menu_orders'&&req.method==='POST'){data=[{id:'22222222-2222-4222-8222-222222222222'}];}
  else data=[];
 }
 if(Array.isArray(data)&&req.headers.accept?.includes('object'))data=data[0]||null;
 res.setHeader('content-type','application/json');res.setHeader('content-range',`0-0/${count|| (Array.isArray(data)?data.length:data?1:0)}`);res.statusCode=req.method==='POST'?201:200;
 res.end(req.method==='HEAD'?'':JSON.stringify(data));
});
(async()=>{
 await new Promise(r=>fixture.listen(54329,'127.0.0.1',r));
 const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54329',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture',RESEND_API_KEY:'',RESEND_FROM_EMAIL:''};
 const next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3105'],{env,stdio:['ignore','pipe','pipe']});next.stdout.on('data',d=>process.stdout.write(d));next.stderr.on('data',d=>process.stderr.write(d));
 let browser;
 try{
  for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:3105/api/public/restaurant-section?store=aguila',{signal:AbortSignal.timeout(2000)});if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
  const loaded=process.env.RESTAURANT_CHROMIUM_MODULE?require(process.env.RESTAURANT_CHROMIUM_MODULE):null,custom=loaded?.default||loaded;
  browser=await chromium.launch({headless:true,...(custom?{executablePath:await custom.executablePath(),args:custom.args}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),token=`${enc({alg:'HS256'})}.${enc({sub:userId,exp:Math.floor(Date.now()/1000)+3600})}.fixture`;
  await page.addInitScript(({token,userId,store})=>{
   if(!sessionStorage.getItem('restaurant-browser-seeded')){localStorage.setItem('cart-aguila',JSON.stringify([{id:'product-shop-eggs',type:'product',name:'Huevos tienda',price:6,base_price:6,quantity:2,stock:10}]));sessionStorage.setItem('restaurant-browser-seeded','1');}
   localStorage.setItem('saas-current-store',JSON.stringify(store));localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:userId,email:'owner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01'}}));
   window.open=(url)=>{window.__whatsappPreview=url;return null;};
  },{token,userId,store});
  await page.route('**/api/exchange-rates',r=>r.fulfill({json:{USD:1,CUP:360}}));
  const origin='http://127.0.0.1:3105';
  await page.goto(origin+'/tienda/aguila',{waitUntil:'domcontentloaded',timeout:120000});await page.getByRole('link',{name:/Comida a domicilio.*Restaurante asociado/}).waitFor({timeout:120000});
  await page.getByRole('link',{name:/Comida a domicilio.*Restaurante asociado/}).click();await page.waitForURL('**/restaurante/aguila',{timeout:120000});
  await page.getByRole('heading',{name:'Restaurante de prueba',exact:true,level:1}).waitFor({timeout:120000});
  assert.ok((await page.locator('main').last().innerText()).includes('Precios en USD'));assert.ok((await page.locator('main').last().innerText()).includes('El delivery lo realiza el restaurante.'));
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await page.getByRole('button',{name:'Abrir carrito del restaurante',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Pedido del restaurante'});await dialog.waitFor();assert.equal(await dialog.getByText('Huevos tienda',{exact:true}).count(),0);
  await dialog.getByRole('button',{name:'Cerrar pedido',exact:true}).click();await page.getByRole('link',{name:'Volver a la tienda Águila'}).click();await page.waitForURL('**/tienda/aguila');
  await page.getByRole('link',{name:/Comida a domicilio.*Restaurante asociado/}).click();await page.waitForURL('**/restaurante/aguila');await page.getByRole('button',{name:'Abrir carrito del restaurante',exact:true}).click();await dialog.getByText('Completa de prueba',{exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Abrir carrito del restaurante',exact:true}).click();await dialog.getByText('Completa de prueba',{exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Continuar',exact:true}).click();await dialog.locator('select').selectOption('restaurant-zone');assert.equal(await dialog.locator('option[value="SHOP-ZONE"]').count(),0);
  await dialog.getByPlaceholder('Dirección exacta y referencia').fill('Calle prueba número 1');await page.setViewportSize({width:390,height:480});
  const nextButton=dialog.getByRole('button',{name:'Continuar',exact:true});await nextButton.scrollIntoViewIfNeeded();const box=await nextButton.boundingBox();assert.ok(box&&box.y+box.height<=480,'next button accessible in reduced viewport');await nextButton.click();
  await dialog.getByPlaceholder('Tu nombre').fill('Cliente de prueba');await dialog.getByPlaceholder('Tu teléfono').fill('55555555');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile checkout has no horizontal overflow');
  await page.setViewportSize({width:390,height:844});await dialog.screenshot({path:'/tmp/aguila-restaurant-checkout.png'});await dialog.getByRole('button',{name:'Confirmar pedido',exact:true}).click();
  await page.waitForFunction(()=>window.__whatsappPreview);const message=new URL(await page.evaluate(()=>window.__whatsappPreview)).searchParams.get('text');assert.match(message,/Restaurante de prueba/);assert.match(message,/Moneda: USD/);assert.match(message,/13.00/);assert.doesNotMatch(message,/Huevos tienda/);
  const shop=await page.evaluate(()=>JSON.parse(localStorage.getItem('cart-aguila')));assert.equal(shop[0].id,'product-shop-eggs');assert.equal(shop[0].quantity,2);assert.equal(await page.evaluate(()=>localStorage.getItem('perla_menu_cart_v1_aguila')),null);
  const order=writes.find(w=>w.table==='menu_orders'&&w.method==='POST');assert.equal(order.body.delivery_fee,3);assert.equal(order.body.delivery_zone_id,null);assert.equal(order.body.total,13);assert.ok(writes.every(w=>!['products','orders','order_items','delivery_zones'].includes(w.table)));
  await page.goto(origin+'/admin/menu/restaurante',{waitUntil:'domcontentloaded',timeout:120000});await page.getByLabel('Nombre del restaurante',{exact:true}).waitFor({timeout:120000});await page.getByLabel('Nombre del restaurante',{exact:true}).fill('Sazón de prueba');await page.getByRole('button',{name:'Guardar configuración',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Guardar configuración',exact:true}).click();await page.getByRole('status').filter({hasText:'Configuración guardada.'}).waitFor();assert.equal(state.config.name,'Sazón de prueba');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'admin mobile has no horizontal overflow');await page.screenshot({path:'/tmp/aguila-restaurant-admin-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/restaurante/aguila');await page.getByRole('heading',{name:'Sazón de prueba',exact:true}).waitFor();await page.waitForLoadState('networkidle');await page.screenshot({path:'/tmp/aguila-restaurant-desktop.png',fullPage:true,caret:'initial'});
  const shared=await fetch(origin+'/api/public/menu-delivery-zones?slug=aguila');assert.equal((await shared.json()).zones[0].id,'restaurant-zone');
  state.config.enabled=false;const blocked=await fetch(origin+'/api/public/restaurant-section?store=aguila');assert.equal((await blocked.json()).section,null);const hidden=await page.goto(origin+'/restaurante/aguila');assert.equal(hidden.status(),404);
  assert.deepEqual(errors,[]);console.log('PASS: actual SSR restaurant and storefront link; independent carts survive navigation/reload; delivery-only checkout, canonical WhatsApp, own zones, admin save, hidden draft, mobile/reduced-height/desktop. All writes stayed in the local fixture.');
 }finally{await browser?.close();next.kill('SIGTERM');fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
