"use client";

import { useEffect } from "react";

const VISITOR_KEY = "perla_visitor_id";
const SESSION_KEY = "perla_session";
const SESSION_LENGTH_MS = 30 * 60 * 1000;
const DEDUPE_MS = 60 * 1000;

type SessionData = { id: string; expiresAt: number };

type VisitTrackerProps = {
  storeId?: string | null;
  pageType?: "store" | "product" | "combo" | "category" | "other";
  productId?: string | null;
  comboId?: string | null;
};

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = createId();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function getSessionId() {
  const now = Date.now();
  const raw = localStorage.getItem(SESSION_KEY);

  if (raw) {
    try {
      const current = JSON.parse(raw) as SessionData;
      if (current.id && current.expiresAt > now) {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ id: current.id, expiresAt: now + SESSION_LENGTH_MS })
        );
        return current.id;
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  const next = { id: createId(), expiresAt: now + SESSION_LENGTH_MS };
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next.id;
}

export default function VisitTracker({
  storeId,
  pageType = "other",
  productId,
  comboId,
}: VisitTrackerProps) {
  useEffect(() => {
    if (!storeId) return;

    const path = window.location.pathname;
    const dedupeKey = `perla_visit:${storeId}:${path}`;
    const lastVisit = Number(sessionStorage.getItem(dedupeKey) || 0);

    if (Date.now() - lastVisit < DEDUPE_MS) return;
    sessionStorage.setItem(dedupeKey, String(Date.now()));

    const payload = {
      storeId,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      path,
      pageType,
      productId: productId || null,
      comboId: comboId || null,
      referrer: document.referrer || null,
    };

    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // El contador nunca debe afectar la experiencia de la tienda.
    });
  }, [storeId, pageType, productId, comboId]);

  return null;
}
