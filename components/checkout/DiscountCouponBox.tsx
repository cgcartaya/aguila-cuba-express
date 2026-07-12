
"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Tag, X } from "lucide-react";

export type AppliedDiscount = {
  campaignId: string;
  code: string;
  discountAmount: number;
  expiresAt: string;
};

type Props = {
  storeId: string;
  phone: string;
  subtotal: number;
  appliedDiscount: AppliedDiscount | null;
  onApply: (discount: AppliedDiscount) => void;
  onRemove: () => void;
};

export function DiscountCouponBox({
  storeId,
  phone,
  subtotal,
  appliedDiscount,
  onApply,
  onRemove,
}: Props) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    setMessage("");

    if (!phone.trim()) {
      setMessage("Escribe primero el teléfono del comprador.");
      return;
    }

    if (!code.trim()) {
      setMessage("Escribe el código del bono.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          code,
          phone,
          subtotal,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.valid) {
        setMessage(result.message || "No se pudo aplicar el bono.");
        return;
      }

      onApply({
        campaignId: result.campaignId,
        code: result.code,
        discountAmount: Number(result.discountAmount || 0),
        expiresAt: result.expiresAt,
      });

      setMessage(result.message);
    } catch {
      setMessage("No se pudo validar el bono.");
    } finally {
      setLoading(false);
    }
  }

  if (appliedDiscount) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 text-green-600" size={20} />
            <div>
              <p className="font-black text-green-800">
                Bono {appliedDiscount.code} aplicado
              </p>
              <p className="mt-1 text-sm font-semibold text-green-700">
                Ahorras ${appliedDiscount.discountAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onRemove();
              setCode("");
              setMessage("");
            }}
            className="rounded-xl bg-white p-2 text-slate-500"
            aria-label="Quitar bono"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Tag size={18} className="text-red-600" />
        <p className="font-black text-slate-900">¿Tienes un bono?</p>
      </div>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Ej: PRIMERA10"
          className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-3 font-bold uppercase outline-none"
        />

        <button
          type="button"
          onClick={handleApply}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-[#061b3a] px-4 py-3 font-black text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : "Aplicar"}
        </button>
      </div>

      {message && (
        <p className="mt-2 text-xs font-semibold text-red-600">{message}</p>
      )}
    </div>
  );
}
