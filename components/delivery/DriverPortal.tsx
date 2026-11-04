'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDriverPages } from '@/lib/delivery/pages';
import NextImage from 'next/image';
import { ArrowLeft, ArrowRight, Camera, Check, CheckCheck, ChevronDown, CircleAlert, ImagePlus, LogOut, MapPin, Package, Phone, RefreshCw, Search, Share2, Truck, Wallet, WifiOff, X } from 'lucide-react';
type Identity={name:string;photoUrl?:string|null;store:{id:string;name:string;slug:string;logoUrl:string|null}};
export type DeliveryRow={id:string;tracking_code:string|null;package_number:string|number|null;recipient_name:string|null;recipient_phone:string|null;recipient_address:string|null;location:string|null;notes:string|null;contains_package:boolean;contains_money:boolean;money_amount:number;status:string;delivered:boolean;delivered_date:string|null;trip_id:string|null;tripLabel?:string|null;trip_order:number|null;updated_at:string;photoUrl:string|null};
const money=(n:number)=>new Intl.NumberFormat('es-US',{style:'currency',currency:'USD'}).format(n||0);
async function request(path:string, init?:RequestInit){
 const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),45000);
 try{
  const res=await fetch('/api/delivery/'+path,{...init,signal:controller.signal,cache:'no-store',headers:{'x-delivery-request':'1',...init?.headers}});
  const result=await res.json();
  if(!res.ok)throw Object.assign(new Error(result.error||'No se pudo completar la operación.'),{status:res.status});
  return result;
 }catch(e){
  if((e as Error&{status?:number}).status)throw e;
  throw new Error('No recibimos confirmación del servidor. Comprueba tu conexión y actualiza para revisar el estado antes de reintentar.');
 }finally{window.clearTimeout(timeout);}
}
async function compressPhoto(file:File){
 // Safari's image decoder handles photos selected through the native picker.
 const url=URL.createObjectURL(file);
 try{
  const img=new Image(); img.src=url; await img.decode();
  const ratio=Math.min(1,1600/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo preparar la cámara.');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la imagen.')),'image/jpeg',.78));
  return new File([blob],'entrega.jpg',{type:'image/jpeg'});
 }finally{URL.revokeObjectURL(url);}
}
export default function DriverPortal({demo,initialStore='',initialBrand=null}:{demo?:{identity:Identity;rows:DeliveryRow[]};initialStore?:string;initialBrand?:Identity['store']|null}){
 const [identity,setIdentity]=useState<Identity|null>(demo?.identity||null),[rows,setRows]=useState<DeliveryRow[]>(demo?.rows||[]);
 const [ready,setReady]=useState(!!demo),[busy,setBusy]=useState(false),[online,setOnline]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [store,setStore]=useState(initialStore),[username,setUsername]=useState(''),[password,setPassword]=useState('');
 const [tab,setTab]=useState('pending'),[search,setSearch]=useState(''),[kind,setKind]=useState('all'),[trip,setTrip]=useState('all'),[visible,setVisible]=useState(30),[loadedAt,setLoadedAt]=useState('');
 const [selected,setSelected]=useState<DeliveryRow|null>(null),[photo,setPhoto]=useState<File|null>(null),[preview,setPreview]=useState(''),[preparing,setPreparing]=useState(false),[confirm,setConfirm]=useState(''),[install,setInstall]=useState(false);
 const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null);
 const load=useCallback(async()=>{
  if(demo)return;
  try{
   const who=await request('session'); setError('');setIdentity(who);
   const all=await loadDriverPages<DeliveryRow>(page=>request('shipments?page='+page));setRows(all);setLoadedAt(new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){const err=e as Error&{status?:number};if(err.status===401||err.status===403){setIdentity(null);setRows([]);setSelected(null);setPhoto(null);}else setError(err.message||'No se pudo conectar. Reintenta.');}
  finally{setBusy(false);setReady(true);}
 },[demo]);
 useEffect(()=>{
  const slug=new URLSearchParams(location.search).get('tienda')||'';
  const manifest=document.querySelector('link[rel="manifest"]');if(slug&&manifest)manifest.setAttribute('href','/repartidores/manifest.webmanifest?tienda='+encodeURIComponent(slug));
  const network=()=>setOnline(navigator.onLine); window.addEventListener('online',network);window.addEventListener('offline',network);
  if(!demo&&'serviceWorker'in navigator)void navigator.serviceWorker.register('/repartidores/sw.js',{scope:'/repartidores'}).catch(()=>{});
  const start=window.setTimeout(()=>{network();void load();},0);
  return()=>{window.clearTimeout(start);window.removeEventListener('online',network);window.removeEventListener('offline',network);};
 },[load,demo]);
 useEffect(()=>{
  const slug=identity?.store.slug||initialStore;
  const manifest=document.querySelector('link[rel="manifest"]');
  if(slug&&manifest)manifest.setAttribute('href','/repartidores/manifest.webmanifest?tienda='+encodeURIComponent(slug));
  if(identity?.store.logoUrl)document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href',identity.store.logoUrl);
 },[identity?.store.slug,identity?.store.logoUrl,initialStore]);
 useEffect(()=>{
  if(!selected&&!install)return;
  const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;const scrollY=window.scrollY;const position=document.body.style.position;const top=document.body.style.top;const width=document.body.style.width;document.body.style.position='fixed';document.body.style.top=`-${scrollY}px`;document.body.style.width='100%';document.body.style.overflow='hidden';
  const dialog=document.querySelector<HTMLElement>(install?'.dp-install':'.dp-detail');
  const controls=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([hidden]),select')||[]);
  controls()[0]?.focus();
  const key=(event:KeyboardEvent)=>{const items=controls();if(event.key==='Tab'&&items.length){const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
  document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.body.style.position=position;document.body.style.top=top;document.body.style.width=width;window.scrollTo(0,scrollY);document.removeEventListener('keydown',key);previous?.focus({preventScroll:true});};
 },[selected,install]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 const login=async(e:React.FormEvent)=>{e.preventDefault();if(demo)return;setBusy(true);setError('');try{await request('session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({store,username,password})});setPassword('');history.replaceState(null,'','/repartidores?tienda='+encodeURIComponent(store));await load();}catch(e){setError((e as Error).message||'No se pudo conectar.');}finally{setBusy(false);}};
 const logout=async()=>{if(demo){setNotice('Demostración: la sesión es ficticia y no se puede cerrar.');return;}setBusy(true);setError('');try{if(!demo)await request('session',{method:'DELETE'});setIdentity(null);setRows([]);setSelected(null);setPhoto(null);setPassword('');setNotice('');}catch(e){setError((e as Error).message||'No se pudo cerrar sesión. Reintenta con conexión.');}finally{setBusy(false);}};
 const choose=async(file?:File)=>{if(!file)return;setPreparing(true);setError('');try{const prepared=await compressPhoto(file);setPhoto(prepared);setPreview(URL.createObjectURL(prepared));}catch{setError('No se pudo abrir la foto. Prueba tomando una nueva o selecciona una imagen JPEG/PNG.');}finally{setPreparing(false);}};
 const close=()=>{if(busy||preparing)return;setSelected(null);setPhoto(null);setConfirm('');setError('');};
 const save=async(action:string)=>{
  if(!selected||busy||!online)return;setBusy(true);setError('');
  try{
   if(demo){setRows(prev=>prev.map(r=>r.id===selected.id?{...r,status:action==='photo'?r.status:action,delivered:action==='delivered'?true:r.delivered}:r));}
   else{const form=new FormData();form.set('id',selected.id);form.set('version',selected.updated_at);form.set('action',action);if(photo)form.set('photo',photo);await request('shipments',{method:'POST',body:form});}
   setSelected(null);setPhoto(null);setConfirm('');setNotice(demo?'Demostración: cambio simulado.':'Guardado y confirmado por el servidor.');await load();
  }catch(e){setConfirm('');setError((e as Error).message||'No recibimos confirmación. Conservamos la foto; actualiza y revisa el envío antes de reintentar.');}
  finally{setBusy(false);}
 };
 const pending=rows.filter(r=>!r.delivered&&r.status!=='cancelled');
 const filtered=rows.filter(r=>(tab==='delivered'?r.delivered:tab==='issue'?r.status==='issue'&&!r.delivered:!r.delivered&&r.status!=='cancelled')&&(kind==='all'||(kind==='money'?r.contains_money:r.contains_package))&&(trip==='all'||(trip==='none'?!r.trip_id:r.trip_id===trip))&&[r.recipient_name,r.recipient_address,r.tracking_code,r.package_number,r.recipient_phone].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(a.trip_order??1e9)-(b.trip_order??1e9));
 const trips=Array.from(new Set(rows.map(r=>r.trip_id).filter(Boolean))) as string[];
 const alert=error?<div className="dp-alert error" role="alert"><CircleAlert size={18}/><span>{error}</span></div>:null;
 return <main className="dp">
  <header className="dp-header"><a href="/repartidores" className="dp-brand" aria-label="Inicio de repartidores"><span className="dp-brand-icon">{(identity?.store.logoUrl||initialBrand?.logoUrl)?<NextImage unoptimized width={46} height={46} src={(identity?.store.logoUrl||initialBrand?.logoUrl)!} alt="Logo de la agencia"/>:<Package size={23}/>}</span><span>{identity?.store.name||initialBrand?.name||'Repartidores'}<small>PORTAL DE ENTREGAS</small></span></a><div className="dp-header-actions"><button onClick={()=>setInstall(true)} aria-label="Cómo instalar en iPhone"><Share2 size={20}/></button>{identity&&<button onClick={()=>void logout()} disabled={busy} aria-label="Cerrar sesión"><LogOut size={20}/></button>}</div></header>
  {demo&&<div className="dp-alert">Vista de demostración · Datos ficticios · No modifica envíos reales</div>}
  {!online&&<div className="dp-alert offline" role="status"><WifiOff size={18}/><span>Sin conexión. Las entregas requieren confirmación del servidor.</span></div>}
  {!ready?<div className="dp-empty"><RefreshCw className="dp-spin"/>Preparando tus entregas…</div>:!identity?<section className="dp-login"><div className="dp-eyebrow">TU RUTA, EN UN SOLO LUGAR</div><h1>Listo para<br/>salir a repartir.</h1><p>Consulta tus asignaciones y guarda la evidencia de cada entrega desde tu teléfono.</p><form onSubmit={login}><label>Agencia<input required value={store} onChange={e=>setStore(e.target.value.trim().toLowerCase())} placeholder="Ej. alvarez-travel" autoCapitalize="none" autoCorrect="off" maxLength={100}/></label><label>Usuario<input required autoComplete="username" autoCapitalize="none" autoCorrect="off" value={username} onChange={e=>setUsername(e.target.value)}/></label><label>Contraseña<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{alert}<button className="dp-primary" disabled={busy||!online}>{busy?'Entrando…':'Entrar a mis entregas'}<ArrowRight size={19}/></button></form><p className="dp-login-note">Usa tu cuenta actual de repartidor. Si no tienes acceso, consulta al administrador de tu agencia.</p><button className="dp-text" onClick={()=>setInstall(true)}><Share2 size={17}/>Añadir al inicio del iPhone</button></section>:<div className="dp-content">
   <div className="dp-greeting"><div><div className="dp-eyebrow">MI JORNADA</div><div className="dp-driver">{identity.photoUrl?<NextImage unoptimized width={52} height={52} src={identity.photoUrl} alt="Foto del repartidor"/>:<span className="dp-avatar">{identity.name.slice(0,1)}</span>}<h1>Hola, {identity.name.split(' ')[0]}</h1></div><p>Una entrega a la vez. Todo registrado.</p></div><button className="dp-refresh" onClick={()=>{setBusy(true);setError('');void load();}} disabled={busy||!online} aria-label="Actualizar envíos"><RefreshCw size={20} className={busy?'dp-spin':''}/></button></div>
   <div className="dp-stats"><div><span><Package size={16}/>Por entregar</span><strong>{pending.length}</strong></div><div><span><CheckCheck size={16}/>Entregados</span><strong>{rows.filter(r=>r.delivered).length}</strong></div><div><span><Wallet size={16}/>Remesas pendientes</span><strong>{money(pending.filter(r=>r.contains_money).reduce((n,r)=>n+Number(r.money_amount||0),0))}</strong></div></div>
   <div className="dp-list-heading"><h2>Mis envíos</h2><span>{loadedAt?'Actualizado '+loadedAt:'Asignados a tu cuenta'}</span></div>
   <div className="dp-tabs" role="tablist" aria-label="Estado de envíos">{[['pending','Pendientes'],['delivered','Entregados'],['issue','Incidencias']].map(([id,label])=><button role="tab" aria-selected={tab===id} className={tab===id?'active':''} key={id} onClick={()=>{setTab(id);setVisible(30);}}>{label}{id==='issue'&&rows.some(r=>r.status==='issue'&&!r.delivered)&&<i/>}</button>)}</div>
   <div className="dp-filters"><label className="dp-search"><Search size={18}/><input aria-label="Buscar envíos" placeholder="Nombre, código o dirección" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="dp-select"><select aria-label="Tipo de envío" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Todos los tipos</option><option value="package">Paquetes</option><option value="money">Remesas</option></select><ChevronDown size={16}/></label><label className="dp-select"><select aria-label="Viaje" value={trip} onChange={e=>setTrip(e.target.value)}><option value="all">Todos los viajes</option><option value="none">Sin viaje</option>{trips.map(id=><option key={id} value={id}>{rows.find(row=>row.trip_id===id)?.tripLabel||'Viaje no disponible'}</option>)}</select><ChevronDown size={16}/></label></div>
   {!selected&&alert}{notice&&<div className="dp-alert success" role="status"><Check size={18}/>{notice}<button aria-label="Cerrar aviso" onClick={()=>setNotice('')}><X size={16}/></button></div>}
   <div className="dp-cards">{filtered.slice(0,visible).map(row=><button className="dp-card" key={row.id} onClick={()=>{setSelected(row);setConfirm('');setError('');setNotice('');}}><div className="dp-card-top"><span className={'dp-state '+(row.delivered?'done':row.status==='issue'?'issue':'')}>{row.delivered?'Entregado':row.status==='issue'?'Incidencia':row.status==='out_for_delivery'?'En reparto':'Pendiente'}</span><span className="dp-code">{row.tracking_code||'#'+(row.package_number||row.id.slice(0,8))}</span></div><h3>{row.recipient_name||'Destinatario sin nombre'}</h3><p><MapPin size={16}/>{row.recipient_address||row.location||'Dirección por confirmar'}</p><div className="dp-card-foot"><div>{row.contains_package&&<span><Package size={15}/>Paquete</span>}{row.contains_money&&<span className="dp-money"><Wallet size={15}/>{money(Number(row.money_amount))}</span>}</div><span className="dp-card-arrow"><ArrowRight size={19}/></span></div></button>)}</div>
   {!filtered.length&&<div className="dp-empty"><CheckCheck size={34}/><h3>{search||kind!=='all'||trip!=='all'?'No encontramos coincidencias':tab==='pending'?'Todo al día por aquí':'Sin envíos en esta sección'}</h3><p>{tab==='pending'?'Los nuevos envíos aparecerán cuando la agencia te los asigne.':'Actualiza para consultar el estado más reciente.'}</p></div>}
   {filtered.length>visible&&<button className="dp-more" onClick={()=>setVisible(n=>n+30)}>Mostrar más envíos ({filtered.length-visible})</button>}

   <footer className="dp-footer"><span className={online?'dp-dot':'dp-dot off'}/>{online?'Conectado · Las entregas se confirman en línea':'Sin conexión · No se pueden guardar cambios'}</footer>
  </div>}
  {selected&&<div className="dp-overlay"><section role="dialog" aria-modal="true" aria-labelledby="delivery-title" className="dp-detail"><div className="dp-detail-head"><button onClick={close} disabled={busy||preparing} aria-label="Volver a mis envíos"><ArrowLeft size={22}/></button><span>Detalle del envío</span><span className="dp-code">{selected.tracking_code||selected.id.slice(0,8)}</span></div><div className="dp-detail-body"><span className="dp-eyebrow">{selected.delivered?'ENTREGADO':selected.status==='issue'?'INCIDENCIA':'POR ENTREGAR'}</span><h2 id="delivery-title">{selected.recipient_name||'Destinatario'}</h2><p className="dp-address"><MapPin size={19}/>{selected.recipient_address||selected.location||'Consulta la dirección con tu agencia.'}</p><div className="dp-contact">{selected.recipient_phone&&<a href={'tel:'+selected.recipient_phone.replace(/[^+\d]/g,'')}><Phone size={18}/>Llamar</a>}{(selected.recipient_address||selected.location)&&<a href={'https://maps.apple.com/?q='+encodeURIComponent([selected.recipient_address,selected.location].filter(Boolean).join(', '))} target="_blank" rel="noreferrer"><MapPin size={18}/>Abrir mapa</a>}</div>
   <div className="dp-summary">{selected.contains_package&&<div><Package size={20}/><span>Paquete para entregar</span><Check size={17}/></div>}{selected.contains_money&&<div><Wallet size={20}/><span>Remesa para entregar<small>Este es el dinero del destinatario</small></span><strong>{money(Number(selected.money_amount))}</strong></div>}</div>
   {selected.notes&&<div className="dp-note"><strong>Indicaciones de la agencia</strong><p>{selected.notes}</p></div>}
   {selected.delivered_date&&<p className="dp-muted">Entrega registrada: {new Date(selected.delivered_date).toLocaleString('es')}</p>}
   <h3>Evidencia de entrega</h3><p className="dp-muted">Toma una foto clara del paquete o de la entrega.</p>
   {((photo&&preview)||selected.photoUrl)&&<div className="dp-photo"><NextImage unoptimized width={1600} height={1200} src={(photo&&preview)||selected.photoUrl!} alt={photo?'Foto seleccionada, aún sin guardar':'Evidencia guardada de la entrega'}/>{photo&&<button onClick={()=>setPhoto(null)} disabled={busy} aria-label="Quitar foto seleccionada"><X size={18}/></button>}</div>}
   {photo&&<p className="dp-photo-status">Foto preparada · Se guardará al confirmar</p>}
   <input hidden ref={camera} type="file" accept="image/*" capture="environment" onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/><input hidden ref={gallery} type="file" accept="image/*" onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/>
   <div className="dp-contact"><button disabled={busy||preparing} onClick={()=>camera.current?.click()}><Camera size={19}/>{preparing?'Preparando…':'Tomar foto'}</button><button disabled={busy||preparing} onClick={()=>gallery.current?.click()}><ImagePlus size={19}/>Galería</button></div>
   {alert}{!online&&<div className="dp-alert offline"><WifiOff size={18}/>Sin conexión. Conserva esta pantalla abierta y reintenta al conectarte.</div>}
   {confirm?<div className="dp-confirm"><h3>{confirm==='delivered'?'¿Confirmas la entrega completa?':confirm==='issue'?'¿Registrar una incidencia?':'¿Marcar como en reparto?'}</h3><p>{confirm==='delivered'?(selected.contains_money&&selected.contains_package?'Se registrará como entregado el paquete y también la remesa.':selected.contains_money?'Confirma que el destinatario recibió la remesa.':'Confirma que el destinatario recibió el paquete.'):'El nuevo estado será visible para la agencia.'}</p><button className="dp-primary" disabled={busy||!online} onClick={()=>void save(confirm)}>{busy?'Guardando…':'Sí, confirmar'}<Check size={18}/></button><button className="dp-text" disabled={busy} onClick={()=>setConfirm('')}>Volver</button></div>:<div className="dp-actions">{!selected.delivered&&<><button className="dp-primary" disabled={busy||preparing||!online} onClick={()=>setConfirm('delivered')}><CheckCheck size={20}/>Confirmar entrega</button><div className="dp-contact"><button disabled={busy||preparing||!online||selected.status==='out_for_delivery'} onClick={()=>setConfirm('out_for_delivery')}><Truck size={18}/>En reparto</button><button disabled={busy||preparing||!online} onClick={()=>setConfirm('issue')}><CircleAlert size={18}/>Incidencia</button></div></>}{photo&&<button className="dp-more" disabled={busy||preparing||!online} onClick={()=>void save('photo')}>Guardar solo la foto</button>}</div>}
   <p className="dp-privacy">Mantén tu sesión privada y ciérrala si compartes el teléfono. Necesitas conexión para guardar.</p>
  </div></section></div>}
  {install&&<div className="dp-overlay"><section role="dialog" aria-modal="true" aria-labelledby="install-title" className="dp-install"><button className="dp-install-close" onClick={()=>setInstall(false)} aria-label="Cerrar instrucciones"><X/></button><span className="dp-brand-icon"><Package/></span><h2 id="install-title">Tus entregas,<br/>a un toque.</h2><p>Abre este enlace en <strong>Safari</strong> desde el iPhone.</p><ol><li>Pulsa el botón <strong>Compartir</strong> <Share2 size={16}/>.</li><li>Selecciona <strong>Añadir a pantalla de inicio</strong>.</li><li>Si aparece, activa <strong>Abrir como app web</strong> y pulsa <strong>Añadir</strong>.</li></ol><p className="dp-muted">Entrarás desde su icono, como una aplicación. Requiere internet para consultar y guardar entregas.</p><button className="dp-primary" onClick={()=>setInstall(false)}>Entendido<Check size={18}/></button></section></div>}
 </main>;
}
