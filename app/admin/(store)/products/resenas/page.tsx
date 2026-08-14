"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, MessageSquareText, Phone, Star, Trash2, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

type Review = {
  id: string;
  product_id: string;
  product_name: string;
  customer_name: string;
  customer_phone: string | null;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((item) => (
        <Star
          key={item}
          size={14}
          className={
            item <= value
              ? "fill-yellow-400 text-yellow-400"
              : "fill-slate-200 text-slate-200"
          }
        />
      ))}
    </div>
  );
}

function statusBadge(status: Review["status"]) {
  if (status === "approved")
    return "bg-green-50 text-green-700 border border-green-200";
  if (status === "rejected")
    return "bg-red-50 text-red-600 border border-red-200";
  return "bg-amber-50 text-amber-700 border border-amber-200";
}

function statusLabel(status: Review["status"]) {
  if (status === "approved") return "Aprobada";
  if (status === "rejected") return "Rechazada";
  return "Pendiente";
}

export default function ResenasAdminPage() {
  const { isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const activeStore = isSuperAdmin ? selectedStore || accessStore : accessStore;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token || ""}` };
  }

  const load = useCallback(async () => {
    if (!activeStore?.id) return;
    setLoading(true);
    setError("");

    const response = await fetch(
      `/api/admin/reviews?storeId=${encodeURIComponent(activeStore.id)}`,
      { headers: await authHeaders(), cache: "no-store" }
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error || "No se pudieron cargar las reseñas.");
    } else {
      setReviews(payload.reviews || []);
    }
    setLoading(false);
  }, [activeStore?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(id: string, action: "approve" | "reject" | "delete") {
    if (!activeStore?.id) return;
    setWorkingId(id);

    const response = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ storeId: activeStore.id, id, action }),
    }).catch(() => null);

    if (response?.ok) {
      if (action === "delete") {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: action === "approve" ? "approved" : "rejected" }
              : r
          )
        );
      }
    }
    setWorkingId(null);
  }

  const visibleReviews =
    filter === "pending" ? reviews.filter((r) => r.status === "pending") : reviews;
  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-28 text-[#061b3a] md:p-6">
      <div className="mx-auto max-w-4xl">
        <AdminPageHeader
          eyebrow="Productos"
          icon={MessageSquareText}
          title="Reseñas"
          description={`Modera las reseñas que dejan los clientes de ${activeStore?.name || "la tienda activa"} antes de que se muestren en la tienda.`}
        />

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              filter === "pending"
                ? "bg-[#061b3a] text-white"
                : "bg-white text-slate-500 shadow-sm"
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              filter === "all"
                ? "bg-[#061b3a] text-white"
                : "bg-white text-slate-500 shadow-sm"
            }`}
          >
            Todas ({reviews.length})
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm font-semibold text-slate-500">Cargando...</p>
        ) : visibleReviews.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">
            {filter === "pending"
              ? "No hay reseñas pendientes de moderación."
              : "Todavía no hay reseñas para esta tienda."}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleReviews.map((review) => (
              <div key={review.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadge(review.status)}`}
                    >
                      {statusLabel(review.status)}
                    </span>

                    <p className="mt-2 font-black">{review.customer_name}</p>
                    <p className="text-sm font-semibold text-slate-500">
                      {review.product_name}
                    </p>

                    <div className="mt-1 flex items-center gap-3">
                      <StarRow value={review.rating} />
                      {review.customer_phone && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Phone size={12} /> {review.customer_phone}
                        </span>
                      )}
                    </div>

                    {review.comment && (
                      <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
                    )}

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(review.created_at).toLocaleDateString("es", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {review.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => moderate(review.id, "approve")}
                        disabled={workingId === review.id}
                        className="inline-flex items-center gap-1 rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white transition hover:bg-green-700 disabled:opacity-60"
                      >
                        <Check size={14} /> Aprobar
                      </button>
                    )}
                    {review.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => moderate(review.id, "reject")}
                        disabled={workingId === review.id}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-300 disabled:opacity-60"
                      >
                        <X size={14} /> Rechazar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => moderate(review.id, "delete")}
                      disabled={workingId === review.id}
                      className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      <Trash2 size={14} /> Borrar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
