const { chromium } = require(
  process.env.SHAREAPP_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const storeId = "11111111-1111-4111-8111-111111111111",
    userId = "22222222-2222-4222-8222-222222222222";
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const token = `${enc({ alg: "HS256" })}.${enc({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
  await page.addInitScript(
    ({ token, userId }) => {
      localStorage.setItem(
        "sb-test-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "fixture",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user: {
            id: userId,
            email: "owner@tienda.test",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-01-01",
          },
        }),
      );
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: async (value) => (window.__copied = value) },
        configurable: true,
      });
    },
    { token, userId },
  );
  const store = {
    id: storeId,
    name: "Tienda de ejemplo",
    slug: "demo",
    is_active: true,
    module_store_enabled: true,
    primary_color: "#6551db",
    secondary_color: "#151d35",
  };
  await page.route("https://test.supabase.co/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.endsWith("/user"))
      data = {
        id: userId,
        email: "owner@tienda.test",
        user_metadata: { full_name: "Dueño de tienda" },
      };
    if (path.endsWith("/profiles"))
      data = {
        id: userId,
        email: "owner@tienda.test",
        full_name: "Dueño de tienda",
        role: "store_owner",
        active: true,
      };
    if (path.endsWith("/store_users"))
      data = {
        id: "membership",
        store_id: storeId,
        user_id: userId,
        role: "OWNER",
        active: true,
        permissions: {},
        stores: store,
      };
    if (path.endsWith("/stores")) data = store;
    const single = route.request().headers().accept?.includes("object");
    if (!Array.isArray(data) && !single && !path.endsWith("/user"))
      data = [data];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });

  const photo = await require("sharp")({create:{width:1200,height:1200,channels:3,background:"#6551db"}}).jpeg().toBuffer();
  await page.route("**/campaign-image.jpg", route => route.fulfill({body:photo,contentType:"image/jpeg"}));
  await page.route("**/r/*/image", route => route.fulfill({body:photo,contentType:"image/jpeg"}));
  await page.addInitScript(({token,userId})=>{
    const session=JSON.parse(localStorage.getItem("sb-test-auth-token"));
    localStorage.setItem("perla-shareapp-auth-v1",JSON.stringify(session));
    window.__shared=[];
    Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>true});
    Object.defineProperty(navigator,"share",{configurable:true,value:async d=>window.__shared.push({url:d.url,text:d.text,files:d.files?.map(f=>({type:f.type,size:f.size}))})});
  },{token,userId});
  const campaignId="33333333-3333-4333-8333-333333333333", itemId="55555555-5555-4555-8555-555555555555";
  let campaigns=[], posts=[], writes=[];
  const report=()=>({periodDays:30,hasMore:false,campaigns:campaigns.map(c=>({...c,campaign_id:c.id,publications:2,visits:24,orders:3,paid_orders:2,paid_total:44})),members:[{member_id:"m1",display_name:"Ana Martínez",publications:2,visits:24,product_views:18,paid_orders:2,paid_total:44}],publications:[{id:"post1",campaign_id:campaignId,campaign_title:"Campaña de octubre",title:"Oferta de Ana",display_name:"Ana Martínez",network:"whatsapp",active:true,url:"https://example.com/r/personal",visits:24,paid_orders:2,paid_total:44}]});
  await page.route("**/api/shareapp/**",async route=>{
    const r=route.request(),u=new URL(r.url()),path=u.pathname.split("/").pop();
    let data={};
    if(r.method()!=="GET" && path!=="poster") writes.push({path,body:r.postDataJSON()});
    if(path==="members") data={members:[],settings:{enabled:true,attribution_days:7}};
    else if(path==="results") data={results:[]};
    else if(path==="me") data={id:userId,fullName:"Ana Martínez",email:"ana@example.com",passwordPending:false};
    else if(path==="stores") data={memberships:[{id:"m1",store_id:storeId,display_name:"Ana",stores:{name:store.name}}]};
    else if(path==="catalog") data={items:[],hasMore:false};
    else if(path==="poster") {
      assert.match(r.headers()["content-type"],/multipart/);
      data={posterPath:`${storeId}/${campaignId}.jpg`,imageUrl:"/campaign-image.jpg"};
    } else if(path==="campaigns") {
      if(u.searchParams.has("target")) data={items:[{id:itemId,name:"Producto de ejemplo"}]};
      else {
        if(r.method()==="POST") {
          const b=r.postDataJSON(); campaigns=[{...b,id:campaignId,item_id:b.itemId,active:true,image_url:"/campaign-image.jpg"}];
        }
        if(r.method()==="PATCH") campaigns[0].active=r.postDataJSON().active;
        data={campaigns:campaigns.filter(c=>u.searchParams.get("scope")==="store"||c.active),hasMore:false};
      }
    } else if(path==="campaign-results") data=report();
    else if(path==="links") {
      if(r.method()==="POST") {
        const b=r.postDataJSON();data={...b,id:`post${posts.length+1}`,campaign_id:b.campaignId,item_id:b.itemId,active:true,url:`https://example.com/r/${String(posts.length+1).padStart(48,"a")}`,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};posts.unshift(data);
      } else if(r.method()==="PATCH") {const b=r.postDataJSON();Object.assign(posts.find(p=>p.id===b.id),b);data=posts.find(p=>p.id===b.id);}
      else data={publications:posts,hasMore:false};
    }
    await route.fulfill({json:data});
  });
  await page.goto("http://127.0.0.1:3200/admin/marketing/gestores",{waitUntil:"domcontentloaded"});
  await page.getByRole("tab",{name:"Campañas",exact:true}).click();
  await page.getByRole("button",{name:"Nueva campaña",exact:true}).click();
  await page.getByLabel("Póster de campaña",{exact:false}).setInputFiles({name:"poster.jpg",mimeType:"image/jpeg",buffer:photo});
  await page.getByLabel("Título de campaña").fill("Campaña de octubre");
  await page.getByLabel("Texto sugerido").fill("Descubre nuestras ofertas de octubre.");
  await page.getByLabel("Destino del enlace").selectOption("product");
  await page.getByLabel("Buscar destino").fill("ejemplo");
  await page.getByRole("option",{name:"Producto de ejemplo",exact:true}).waitFor({state:"attached"});
  await page.getByLabel("Producto de destino",{exact:false}).selectOption(itemId);
  await page.getByRole("button",{name:"Guardar campaña",exact:true}).click();
  await page.getByText("Campaña preparada.",{exact:false}).waitFor();
  assert.equal(writes.find(w=>w.path==="campaigns").body.itemId,itemId);
  await page.getByRole("img",{name:"Póster: Campaña de octubre",exact:true}).waitFor();
  await page.getByRole("button",{name:"Pausar",exact:true}).click();
  await page.getByText("Campaña pausada",{exact:true}).waitFor();
  await page.getByRole("button",{name:"Habilitar",exact:true}).click();
  await page.getByRole("button",{name:"Pausar",exact:true}).waitFor();
  await page.getByRole("button",{name:"Ver resultados",exact:true}).click();
  await page.getByRole("heading",{name:/Comparación por gestor/}).waitFor();
  await page.getByRole("button",{name:"Copiar enlace personal",exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__copied),"https://example.com/r/personal");
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`owner campaign overflow ${width}`);
  }
  await page.setViewportSize({width:390,height:1000});
  await page.screenshot({path:"/tmp/shareapp-campaign-owner.png",fullPage:true});
  await page.goto("http://127.0.0.1:3200/gestores",{waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:"Campañas",exact:true}).click();
  await page.getByRole("button",{name:"Crear mi publicación",exact:true}).click();
  await page.getByRole("textbox",{name:"Texto de la publicación"}).fill("Mi oferta de octubre. Escríbeme para más información.");
  await page.getByRole("button",{name:"Guardar publicación",exact:true}).click();
  await page.getByText("Publicación guardada.",{exact:false}).waitFor();
  assert.equal(posts[0].campaign_id,campaignId);
  assert.match(posts[0].body,/Mi oferta/);
  // Sharing the tracked URL permits a clickable preview; attachment is an explicit alternative.
  await page.getByRole("button",{name:"Compartir publicación",exact:true}).first().click();
  const shared=await page.evaluate(()=>window.__shared);
  assert.ok(shared.some(s=>s.url===posts[0].url||s.text?.includes(posts[0].url)));
  await page.getByText("Compartir foto en Instagram, estados o historias",{exact:true}).click();
  await page.getByRole("button",{name:"Enviar foto adjunta",exact:true}).click();
  const attached=await page.evaluate(()=>window.__shared);
  assert.ok(attached.some(s=>s.files?.[0]?.type==="image/jpeg" && s.text.includes(posts[0].url)));
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`gestor campaign overflow ${width}`);
  }
  await page.getByRole("button",{name:"Campañas",exact:true}).click();
  await page.setViewportSize({width:390,height:1000});
  await page.screenshot({path:"/tmp/shareapp-campaign-gestor.png",fullPage:true});
  await page.getByRole("button",{name:"Mis resultados de campañas",exact:true}).click();
  await page.getByRole("heading",{name:"Detalle por publicación",exact:true}).waitFor();
  assert.equal(await page.getByRole("heading",{name:/Comparación por gestor/}).count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,checks:["owner upload and product destination","pause/re-enable preserves results","owner campaign/member/publication comparison","personal link copy","gestor poster to custom tracked publication","native share receives personal URL","320/390/768/1440 responsive","own campaign results","no page errors"]}));
  await page.unrouteAll({behavior:"ignoreErrors"});await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
