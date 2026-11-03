"use client";

import { useEffect, useState } from "react";
import { storeBranding, type BrandingStore, type StoreBranding } from "@/lib/saas/store-branding";
import { getPublicStoreBranding } from "@/lib/services/store-branding";

export function useStoreBranding(store?: BrandingStore | null) {
  const [loaded, setLoaded] = useState<{ id: string; brand: StoreBranding } | null>(null);
  const id = store?.id;
  useEffect(() => {
    if (!id) return;
    let current = true;
    void getPublicStoreBranding(id).then(brand => {
      if (current) setLoaded({ id, brand });
    });
    return () => { current = false; };
  }, [id]);
  return id && loaded?.id === id ? loaded.brand : storeBranding(store);
}
