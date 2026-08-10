"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  CheckCheck,
  MessageCircle,
  PackageCheck,
  Send,
  Smartphone,
  TrendingUp,
} from "lucide-react";

const STEPS = [
  "Pedido recibido",
  "Inventario actualizado",
  "Mensaje enviado",
  "Venta registrada",
];

export default function AnimatedOrder() {
  const [step, setStep] = useState(0);
  const [revenue, setRevenue] = useState(12450);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % STEPS.length);
      setRevenue((current) => current + Math.floor(Math.random() * 80) + 25);
    }, 1350);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative h-full overflow-hidden bg-slate-50 p-5 text-slate-900 sm:p-7">
      <div className="absolute -right-20 top-8 h-56 w-56 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
              Pedidos conectados
            </p>
            <h3 className="mt-1 text-2xl font-black">
              Del carrito a WhatsApp
            </h3>
            <p className="mt-2 max-w-lg text-sm text-slate-500">
              Cada acción actualiza el negocio y mantiene al cliente informado
              automáticamente.
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <MessageCircle size={28} />
          </div>
        </div>

        <div className="mt-6 grid flex-1 gap-4 sm:grid-cols-[1fr_.92fr]">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <PackageCheck size={23} />
                </div>
                <div>
                  <p className="text-xs font-black">Pedido #PM-2481</p>
                  <p className="text-[10px] font-bold text-slate-400">
                    Cliente Demo • $86.40
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-700">
                Procesando
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {STEPS.map((label, index) => {
                const completed = index <= step;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-500 ${
                      completed
                        ? "border-violet-200 bg-violet-50"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        completed
                          ? "bg-violet-600 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {completed ? <Check size={16} /> : index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-black">{label}</p>
                      <p className="text-[9px] font-bold text-slate-400">
                        {completed ? "Completado ahora" : "Esperando"}
                      </p>
                    </div>
                    {index === step && (
                      <span className="h-2 w-2 animate-ping rounded-full bg-violet-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[26px] bg-[#0f172a] p-5 text-white shadow-xl">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-emerald-400" />
                <p className="text-xs font-black">WhatsApp Business</p>
              </div>

              <div className="mt-4 rounded-2xl rounded-tl-sm bg-emerald-500 p-4 text-[11px] font-bold text-white shadow-lg">
                Hola Cliente Demo 👋 Tu pedido PM-2481 fue confirmado. Total:
                $86.40. Te avisaremos cuando salga para entrega.
              </div>

              <div className="mt-3 flex items-center justify-end gap-1 text-[9px] font-bold text-slate-400">
                Enviado ahora <CheckCheck size={13} className="text-sky-400" />
              </div>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-xs font-black"
              >
                <Send size={14} />
                Responder al cliente
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <TrendingUp size={18} className="text-violet-600" />
                <p className="mt-3 text-[10px] font-bold text-slate-400">
                  Ingresos
                </p>
                <p className="mt-1 text-lg font-black">
                  ${revenue.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <BarChart3 size={18} className="text-fuchsia-600" />
                <p className="mt-3 text-[10px] font-bold text-slate-400">
                  Conversión
                </p>
                <p className="mt-1 text-lg font-black">24.8%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
