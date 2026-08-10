"use client";

import { useState } from "react";
import { CircleDollarSign, X } from "lucide-react";

import PaymentCollectPanel from "@/components/admin/shipping/PaymentCollectPanel";
import type { Shipment } from "@/lib/shipping/types";

export default function PaymentCollectButton({
  shipment,
  onPaid,
  compact = true,
}: {
  shipment: Shipment;
  onPaid?: (folio: string | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Ya está pagado — no hay nada que cobrar.
  if (shipment.payment_status === "paid") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
      >
        <CircleDollarSign size={17} />
        {compact ? "Cobrar" : "Cobrar envío"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <PaymentCollectPanel
              shipment={{
                id: shipment.id,
                trackingCode: shipment.tracking_code || shipment.id,
                servicePrice: Number(shipment.service_price || 0),
                customerPhone: shipment.sender_phone || "",
              }}
              onPaid={(folio) => {
                setOpen(false);
                onPaid?.(folio);
              }}
            />

            <p className="mt-6 text-center text-xs font-semibold text-slate-400">
              También puedes cerrar esta ventana y cobrarlo más tarde.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
