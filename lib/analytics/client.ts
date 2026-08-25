"use client";

const VISITOR_KEY = "perla_visitor_id";
const SESSION_KEY = "perla_session";
const UTM_KEY = "perla_utm";
const SESSION_MS = 30 * 60 * 1000;
const FLUSH_DELAY_MS = 1800;
const MAX_BATCH_SIZE = 20;

export type AnalyticsEventName =
  | "page_view"
  | "product_view"
  | "menu_item_view"
  | "add_to_cart"
  | "view_cart"
  | "begin_checkout"
  | "reservation_started"
  | "reservation_completed"
  | "order_created";

export type AnalyticsEventPayload = {
  storeId: string;
  eventName: AnalyticsEventName;
  productId?: string | null;
  menuItemId?: string | null;
  comboId?: string | null;
  orderId?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  value?: number | null;
  metadata?: Record<string, unknown>;
};

type QueuedEvent = AnalyticsEventPayload & {
  visitorId: string;
  sessionId: string;
  path: string;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
};

const queue: QueuedEvent[] = [];
let flushTimer: number | null = null;

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVisitorId() {
  let value = localStorage.getItem(VISITOR_KEY);
  if (!value) {
    value = createId();
    localStorage.setItem(VISITOR_KEY, value);
  }
  return value;
}

function getSessionId() {
  const now = Date.now();
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as { id?: string; expiresAt?: number } | null;
    if (saved?.id && Number(saved.expiresAt) > now) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: saved.id, expiresAt: now + SESSION_MS }));
      return saved.id;
    }
  } catch {
    // Se crea una sesión nueva si el valor local está dañado.
  }

  const fresh = { id: createId(), expiresAt: now + SESSION_MS };
  localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
  return fresh.id;
}

export function captureUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    content: params.get("utm_content"),
  };
  if (Object.values(utm).some(Boolean)) localStorage.setItem(UTM_KEY, JSON.stringify(utm));
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsEvents();
  }, FLUSH_DELAY_MS);
}

export async function flushAnalyticsEvents() {
  if (typeof window === "undefined" || queue.length === 0) return;
  const events = queue.splice(0, MAX_BATCH_SIZE);
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // La analítica nunca debe interferir con la experiencia del cliente.
  }
  if (queue.length > 0) scheduleFlush();
}

export function trackAnalyticsEvent(payload: AnalyticsEventPayload) {
  if (typeof window === "undefined" || !payload.storeId) return;
  captureUtm();
  const sessionId = getSessionId();
  const dedupeNames: AnalyticsEventName[] = [
    "page_view", "product_view", "menu_item_view", "view_cart",
    "begin_checkout", "reservation_started", "reservation_completed", "order_created",
  ];
  if (dedupeNames.includes(payload.eventName)) {
    const entity = payload.productId || payload.menuItemId || payload.comboId || payload.orderId || window.location.pathname;
    const dedupeKey = `perla_event:${sessionId}:${payload.storeId}:${payload.eventName}:${entity}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");
  }
  let utm: Partial<QueuedEvent> = {};
  try {
    utm = JSON.parse(localStorage.getItem(UTM_KEY) || "{}") as Partial<QueuedEvent>;
  } catch {
    // Continúa sin atribución UTM.
  }

  queue.push({
    ...payload,
    visitorId: getVisitorId(),
    sessionId,
    path: window.location.pathname,
    source: utm.source || null,
    medium: utm.medium || null,
    campaign: utm.campaign || null,
    content: utm.content || null,
  });

  if (queue.length >= MAX_BATCH_SIZE) void flushAnalyticsEvents();
  else scheduleFlush();
}

export function trackPageViewOnce(storeId: string, path: string) {
  if (typeof window === "undefined" || !storeId || path.startsWith("/admin")) return;
  const key = `perla_page_view:${getSessionId()}:${storeId}:${path}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  trackAnalyticsEvent({ storeId, eventName: "page_view" });
}
