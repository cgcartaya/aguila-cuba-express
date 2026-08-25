"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/hooks/useStore";
import { flushAnalyticsEvents, trackPageViewOnce } from "@/lib/analytics/client";

export default function InternalAnalyticsTracker() {
  const pathname = usePathname();
  const { store } = useStore();

  useEffect(() => {
    if (store?.id) trackPageViewOnce(store.id, pathname);
  }, [pathname, store?.id]);

  useEffect(() => {
    const flush = () => { void flushAnalyticsEvents(); };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  return null;
}
