const worker=`
const CACHE='delivery-public-v1', OFFLINE='/delivery/offline.html';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.add(OFFLINE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('delivery-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Never cache private HTML, API responses, shipment data or signed photos.
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'&&(u.pathname==='/repartidores'||u.pathname.startsWith('/repartidores/')))
 e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(OFFLINE)));
});`;
export function GET(){return new Response(worker,{headers:{'Content-Type':'application/javascript','Cache-Control':'no-cache','Service-Worker-Allowed':'/repartidores'}});}
