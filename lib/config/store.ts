/* =========================================================
   STORE CONFIG

   Configuración temporal para preparar el SaaS multi-tienda
   sin romper Águila Cuba Express.

   Más adelante este valor se resolverá automáticamente por:

   - dominio
   - subdominio
   - slug
========================================================= */

export const DEFAULT_STORE_SLUG = "aguila";

/* =========================================================
   STORE TYPE
========================================================= */

export type Store = {
  id: string;
  name: string;
  slug: string;

  domain?: string | null;

  logo_url?: string | null;

  primary_color?: string | null;
  secondary_color?: string | null;

  is_active: boolean;

  plan?: string | null;

  monthly_price?: number | null;

  created_at?: string;
};