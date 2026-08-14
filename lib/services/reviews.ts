import { supabase } from "@/lib/supabase";

/* =========================================================
   RESEÑAS DE PRODUCTOS - LADO PÚBLICO (tienda)

   Estas funciones corren con el cliente anon (@/lib/supabase),
   así que dependen 100% de las políticas RLS de
   product_reviews (ver sql/migration_product_reviews.sql):
     - insert: cualquiera, siempre queda en 'pending'
     - select: cualquiera, solo status='approved'

   La moderación (ver todo, aprobar/rechazar/borrar) vive en
   app/api/admin/reviews/route.ts con supabaseAdmin, igual que
   el resto de las rutas de admin de este proyecto — no acá.
========================================================= */

export type ProductReview = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export async function getApprovedProductReviews(
  productId: string,
  storeId: string,
  limit = 20
) {
  if (!productId || !storeId) {
    return { data: [] as ProductReview[], error: null };
  }

  return supabase
    .from("product_reviews")
    .select("id, customer_name, rating, comment, created_at")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
}

type SubmitReviewInput = {
  productId: string;
  storeId: string;
  customerName: string;
  customerPhone?: string | null;
  rating: number;
  comment?: string | null;
  deviceToken?: string | null;
};

export async function submitProductReview(input: SubmitReviewInput) {
  const rating = Math.round(input.rating);

  if (!input.productId || !input.storeId) {
    return { data: null, error: { message: "Falta el producto o la tienda." } };
  }
  if (!input.customerName.trim()) {
    return { data: null, error: { message: "Falta el nombre." } };
  }
  if (rating < 1 || rating > 5) {
    return { data: null, error: { message: "La calificación debe ser de 1 a 5." } };
  }

  return supabase
    .from("product_reviews")
    .insert({
      product_id: input.productId,
      store_id: input.storeId,
      customer_name: input.customerName.trim().slice(0, 120),
      customer_phone: input.customerPhone?.trim().slice(0, 40) || null,
      rating,
      comment: input.comment?.trim().slice(0, 1000) || null,
      device_token: input.deviceToken || null,
    })
    .select("id")
    .single();
}
