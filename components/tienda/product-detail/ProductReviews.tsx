"use client";

/* =========================================================
   RESEÑAS DE PRODUCTO - PÁGINA DE PRODUCTO (TIENDA)

   - Muestra el promedio + lista de reseñas aprobadas.
   - Formulario simple para dejar una reseña nueva (nombre,
     estrellas, comentario) — queda 'pending' hasta que un
     admin la aprueba desde /admin/products/resenas.
   - Un mismo dispositivo (mismo criterio de "recordar cliente"
     que ya usa el checkout, ver deviceTokenKey en
     app/tienda/[slug]/checkout/page.tsx) no puede dejar 2
     reseñas para el mismo producto — lo bloquea el índice único
     en la base, acá solo se muestra el mensaje amigable.
========================================================= */

import { useEffect, useState } from "react";
import { Star, MessageSquareText } from "lucide-react";

import {
  getApprovedProductReviews,
  submitProductReview,
  type ProductReview,
} from "@/lib/services/reviews";

type Props = {
  productId: string;
  storeId: string;
  storeSlug: string;
  ratingAvg?: number;
  ratingCount?: number;
};

function deviceTokenKey(slug: string) {
  return `tienda_device_${slug || "aguila"}`;
}

function ensureDeviceToken(slug: string): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(deviceTokenKey(slug));
    if (existing) return existing;

    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(deviceTokenKey(slug), generated);
    return generated;
  } catch {
    return "";
  }
}

function StarRow({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((item) => (
        <Star
          key={item}
          size={size}
          className={
            item <= rounded
              ? "fill-yellow-400 text-yellow-400"
              : "fill-slate-200 text-slate-200"
          }
        />
      ))}
    </div>
  );
}

export default function ProductReviews({
  productId,
  storeId,
  storeSlug,
  ratingAvg = 0,
  ratingCount = 0,
}: Props) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!productId || !storeId) return;
      setLoading(true);
      const { data } = await getApprovedProductReviews(productId, storeId);
      if (active) {
        setReviews((data as ProductReview[]) || []);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [productId, storeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim() || rating < 1) {
      setFeedback({
        type: "error",
        text: "Escribe tu nombre y elige una calificación.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const { error } = await submitProductReview({
      productId,
      storeId,
      customerName: name,
      rating,
      comment,
      deviceToken: ensureDeviceToken(storeSlug),
    });

    setSubmitting(false);

    if (error) {
      const alreadyReviewed = /duplicate key|unique/i.test(error.message || "");
      setFeedback({
        type: "error",
        text: alreadyReviewed
          ? "Ya dejaste una reseña para este producto. ¡Gracias!"
          : "No se pudo enviar tu reseña. Intenta de nuevo.",
      });
      return;
    }

    setFeedback({
      type: "success",
      text: "¡Gracias! Tu reseña quedará visible en cuanto sea revisada.",
    });
    setName("");
    setRating(0);
    setComment("");
    setShowForm(false);
  }

  return (
    <section className="mt-10 border-t border-slate-100 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#061b3a]">
            Opiniones de clientes
          </h2>

          {ratingCount > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <StarRow value={ratingAvg} />
              <span className="text-sm font-bold text-slate-600">
                {ratingAvg.toFixed(1)}
              </span>
              <span className="text-sm text-slate-400">
                ({ratingCount} {ratingCount === 1 ? "reseña" : "reseñas"})
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-400">
              Todavía no hay reseñas para este producto.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-[#061b3a] shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md"
        >
          <MessageSquareText size={16} />
          Escribir reseña
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRating(item)}
                onMouseEnter={() => setHoverRating(item)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
                aria-label={`${item} estrellas`}
              >
                <Star
                  size={24}
                  className={
                    item <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-slate-200 text-slate-200"
                  }
                />
              </button>
            ))}
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={120}
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-red-300 focus:outline-none"
          />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Qué te pareció? (opcional)"
            maxLength={1000}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-red-300 focus:outline-none"
          />

          {feedback && (
            <p
              className={`mt-2 text-sm font-semibold ${
                feedback.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-3 w-full rounded-xl bg-[#061b3a] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#0a2657] disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Enviar reseña"}
          </button>
        </form>
      )}

      <div className="mt-5 space-y-4">
        {loading && (
          <p className="text-sm text-slate-400">Cargando reseñas...</p>
        )}

        {!loading && reviews.length === 0 && (
          <p className="text-sm text-slate-400">
            Sé el primero en dejar tu opinión sobre este producto.
          </p>
        )}

        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#061b3a]">
                {review.customer_name}
              </p>
              <StarRow value={review.rating} size={14} />
            </div>

            {review.comment && (
              <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
            )}

            <p className="mt-2 text-xs text-slate-400">
              {new Date(review.created_at).toLocaleDateString("es", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Feedback state y errores de moderación no bloquean el resto de la
   página de producto — si falla la carga de reseñas, simplemente se
   muestra "Todavía no hay reseñas" en vez de romper la página. */
