/* =========================================================
   IMPORTS
========================================================= */

import { ShieldCheck, Truck } from "lucide-react";

/* =========================================================
   DELIVERY INFO
========================================================= */

export default function DeliveryInfo() {
  return (
    <div className="mt-6 grid gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
        <Truck className="text-red-600" />

        <div>
          <p className="font-black">Entrega en Cuba</p>
          <p className="text-sm text-slate-500">
            Servicio disponible según provincia.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
        <ShieldCheck className="text-green-600" />

        <div>
          <p className="font-black">Compra segura</p>
          <p className="text-sm text-slate-500">
            Confirmamos tu pedido antes del envío.
          </p>
        </div>
      </div>
    </div>
  );
}