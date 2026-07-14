"use client";

const VISITOR_KEY = "perla_visitor_id";
const SESSION_KEY = "perla_session";
const UTM_KEY = "perla_utm";
const SESSION_MS = 30 * 60 * 1000;

type EventName = "add_to_cart" | "view_cart" | "begin_checkout" | "order_created";
type EventPayload = {
  storeId: string;
  eventName: EventName;
  productId?: string | null;
  comboId?: string | null;
  orderId?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  value?: number | null;
  metadata?: Record<string, unknown>;
};
function id(){ return crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function visitor(){ let v=localStorage.getItem(VISITOR_KEY); if(!v){v=id();localStorage.setItem(VISITOR_KEY,v);} return v; }
function session(){ const now=Date.now(); try{const x=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");if(x?.id&&x.expiresAt>now){localStorage.setItem(SESSION_KEY,JSON.stringify({id:x.id,expiresAt:now+SESSION_MS}));return x.id;}}catch{} const x={id:id(),expiresAt:now+SESSION_MS};localStorage.setItem(SESSION_KEY,JSON.stringify(x));return x.id; }
export function captureUtm(){ const p=new URLSearchParams(location.search); const utm={source:p.get("utm_source"),medium:p.get("utm_medium"),campaign:p.get("utm_campaign"),content:p.get("utm_content")}; if(Object.values(utm).some(Boolean)) localStorage.setItem(UTM_KEY,JSON.stringify(utm)); }
export function trackAnalyticsEvent(payload:EventPayload){ if(typeof window==="undefined"||!payload.storeId)return; captureUtm(); let utm={};try{utm=JSON.parse(localStorage.getItem(UTM_KEY)||"{}");}catch{} fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,visitorId:visitor(),sessionId:session(),path:location.pathname,...utm}),keepalive:true}).catch(()=>{}); }
