/* Run with a local Next server and test Supabase env, never against production. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const runtime=process.env.LANDING_CHROMIUM_MODULE?require(process.env.LANDING_CHROMIUM_MODULE):null,custom=runtime?.default||runtime;
 const browser=await chromium.launch({headless:true,...(custom?{executablePath:await custom.executablePath(),args:custom.args}:{})});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1050},timezoneId:'Asia/Tokyo'});
 const storeId='772a5d87-b460-4e9a-bc97-e52425e1202f',userId='22222222-2222-4222-8222-222222222222';
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),token=`${enc({alg:'HS256'})}.${enc({sub:userId,exp:Math.floor(Date.now()/1000)+3600})}.fixture`;
 await page.addInitScript(({token,userId})=>localStorage.setItem('sb-test-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:userId,email:'owner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01'}})),{token,userId});
 const store={id:storeId,name:'Yoyo Envíos',slug:'yoyo-envios',is_active:true,module_store_enabled:true,module_shipping_enabled:true,module_pickups_enabled:true};
 await page.route('https://test.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data=[];
  if(path.endsWith('/user'))data={id:userId,email:'owner@example.test',user_metadata:{}};
  if(path.endsWith('/profiles'))data={id:userId,role:'store_owner',active:true,email:'owner@example.test'};
  if(path.endsWith('/store_users'))data={id:'member',store_id:storeId,user_id:userId,role:'OWNER',active:true,permissions:{},stores:store};
  if(path.endsWith('/stores'))data=store;
  if(!Array.isArray(data)&&!req.headers().accept?.includes('object')&&!path.endsWith('/user'))data=[data];
  await route.fulfill({contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(data)});
 });
 await page.route('**/api/analytics/event',r=>r.fulfill({json:{ok:true}}));
 let fail=true;const calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/analytics/landing?*',async r=>{
  const url=new URL(r.request().url()),period=url.searchParams.get('period');assert.equal(url.searchParams.get('storeId'),storeId);assert.equal(r.request().headers().authorization,`Bearer ${token}`);calls.push(period);
  if(period==='last_month'&&fail)return r.fulfill({status:500,json:{error:'No se pudieron cargar las estadísticas. Intenta de nuevo.'}});
  const zero=period==='7d';await r.fulfill({json:{period,timezone:'America/New_York',startDate:'2026-10-01',endDate:'2026-10-24',updatedAt:'2026-10-24T16:47:00Z',totals:zero?{views:0,visits:0,visitors:0}:{views:84,visits:69,visitors:44},daily:Array.from({length:24},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,views:zero?0:4,visits:zero?0:3,visitors:zero?0:2}))}});
 });
 await page.goto(`${process.env.LANDING_TEST_ORIGIN||'http://127.0.0.1:3104'}/admin`,{waitUntil:'domcontentloaded',timeout:120000});
 const panel=page.locator('#visitas-landing');await panel.getByText('69',{exact:true}).waitFor({timeout:120000});
 for(const value of ['84','44'])assert.equal(await panel.getByText(value,{exact:true}).count(),1);
 assert.ok((await panel.innerText()).includes('America/New_York'));
 await panel.screenshot({path:'/tmp/landing-stats-desktop.png'});
 await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile page overflow');
 await panel.getByText('Ver datos diarios',{exact:true}).click();assert.equal(await panel.locator('tbody tr').count(),24);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no expanded table overflow');
 await panel.getByText('Ver datos diarios',{exact:true}).click();await panel.screenshot({path:'/tmp/landing-stats-mobile.png'});
 await panel.getByLabel('Período de visitas de la landing').selectOption('7d');await panel.getByText('No hay visitas registradas en este período.').waitFor();assert.equal(await panel.getByText('69',{exact:true}).count(),0);
 await panel.getByLabel('Período de visitas de la landing').selectOption('last_month');await panel.getByRole('alert').waitFor();assert.equal(await panel.getByText('0',{exact:true}).count(),0,'errors do not show zero metrics');
 fail=false;await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await panel.getByText('69',{exact:true}).waitFor();assert.deepEqual(calls,['this_month','7d','last_month','last_month']);
 assert.deepEqual(errors,[]);console.log('Browser passed: Yoyo admin panel, monthly metrics, mobile/desktop, table, periods, zero state, error/retry, JWT/store scope.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
