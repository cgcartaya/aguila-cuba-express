import {
  BadgeCheck,
  Bell,
  Box,
  ChartNoAxesCombined,
  CheckCircle2,
  Globe2,
  MessageCircle,
  Package,
  Play,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { demoUrl, whatsappUrl } from "./links";

const trustItems = [
  "Fácil de usar",
  "Sin comisiones por venta",
  "Soporte 24/7",
  "Datos seguros",
];

function FloatingBadge({
  className,
  icon,
  title,
  text,
}: {
  className: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      className={`hidden rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-2xl shadow-violet-200/70 backdrop-blur-xl lg:block ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          {icon}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
            {title}
          </p>
          <p className="text-sm font-black text-[#071044]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  const stats = [
    ["Ventas", "$8,250", "+16.5%"],
    ["Órdenes", "248", "+10.6%"],
    ["Productos", "540", "+7.6%"],
    ["Clientes", "320", "+8.4%"],
  ];

  const orders = [
    ["#1248", "María González", "$120.00", "Pendiente"],
    ["#1247", "Carlos Pérez", "$85.00", "Confirmada"],
    ["#1246", "Ana Torres", "$60.00", "En tránsito"],
    ["#1245", "Luis Gómez", "$78.00", "Entregada"],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[760px] lg:animate-[float_7s_ease-in-out_infinite]">
      <FloatingBadge
        className="absolute -right-12 top-14 z-20"
        icon={<BadgeCheck className="h-5 w-5" />}
        title="Dominio activo"
        text="cliente.perlamarketplace.com"
      />

      <FloatingBadge
        className="absolute -left-14 bottom-24 z-20"
        icon={<MessageCircle className="h-5 w-5" />}
        title="WhatsApp conectado"
        text="Pedidos directos"
      />

      <div className="absolute -left-6 top-32 hidden h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-xl shadow-violet-500/30 lg:flex">
        <ShoppingCart className="h-7 w-7" />
      </div>

      <div className="absolute -bottom-4 left-3 hidden h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-white shadow-xl shadow-amber-300/40 lg:flex">
        <Package className="h-7 w-7" />
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_90px_rgba(139,92,246,0.24)] ring-1 ring-violet-100">
        <div className="flex min-h-[420px]">
          <aside className="hidden w-[86px] flex-col items-center gap-5 bg-[#07165f] py-7 text-white md:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Store className="h-5 w-5" />
            </div>

            {[ChartNoAxesCombined, ShoppingCart, Package, Users, Search, Bell].map(
              (Icon) => (
                <div
                  key={Icon.name}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/10"
                >
                  <Icon className="h-5 w-5" />
                </div>
              )
            )}
          </aside>

          <div className="flex-1 p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[#7c86b6]">
                  Hola, Admin 👋
                </p>
                <h3 className="mt-1 text-xl font-black text-[#081044] sm:text-2xl">
                  Dashboard
                </h3>
              </div>

              <div className="flex items-center gap-3 text-[#7580ad]">
                <Bell className="h-5 w-5" />
                <div className="h-8 w-8 rounded-full bg-violet-100" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(([label, value, growth]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="text-xs font-bold text-[#7983ac]">{label}</p>
                  <p className="mt-2 text-2xl font-black text-[#081044]">
                    {value}
                  </p>
                  <p className="mt-1 text-xs font-black text-emerald-500">
                    ↗ {growth}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-[#081044]">
                  Ventas de los últimos 7 días
                </p>

                <div className="mt-6 flex h-40 items-end gap-3">
                  {[32, 55, 40, 72, 52, 78, 95].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-xl bg-gradient-to-t from-violet-200 via-violet-400 to-violet-600 shadow-lg shadow-violet-200/60"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-[#081044]">
                  Órdenes recientes
                </p>

                <div className="mt-4 space-y-3">
                  {orders.map(([id, name, total, status]) => (
                    <div
                      key={id}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-xs"
                    >
                      <p className="font-black text-[#081044]">{id}</p>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#4f5b8c]">
                          {name}
                        </p>
                        <p className="font-black text-[#081044]">{total}</p>
                      </div>
                      <span className="rounded-full bg-violet-50 px-2 py-1 font-black text-violet-600">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-10 w-[210px] rotate-3 rounded-[2rem] border border-slate-200 bg-[#07165f] p-3 shadow-2xl shadow-violet-200 lg:absolute lg:-right-16 lg:bottom-6 lg:mt-0">
        <div className="rounded-[1.5rem] bg-white p-3 text-[#081044]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-black">DL Racing Cyber</p>
              <p className="text-[10px] font-bold text-slate-400">Informática</p>
            </div>
            <Search className="h-4 w-4" />
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#07165f] to-violet-600 p-4 text-white shadow-lg shadow-violet-200/70">
            <p className="text-xs font-black">
              Componentes de alto rendimiento
            </p>
            <button className="mt-3 rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#07165f]">
              Ver ahora
            </button>
          </div>

          <p className="mt-4 text-xs font-black">Categorías</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[Box, Package, ShoppingCart].map((Icon) => (
              <div
                key={Icon.name}
                className="flex h-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600"
              >
                <Icon className="h-5 w-5" />
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs font-black">Productos destacados</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="h-16 rounded-xl bg-slate-100" />
            <div className="h-16 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerlaHero() {
  return (
    <section className="relative -mt-20 overflow-hidden px-5 pb-10 pt-32 sm:pt-36 lg:px-8 lg:pb-20 lg:pt-40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#8b5cf61c,transparent_42%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,#06b6d41c,transparent_42%)]" />
      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(#8b5cf6_1px,transparent_1px),linear-gradient(to_right,#8b5cf6_1px,transparent_1px)] [background-size:58px_58px]" />

      <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-sky-200/80 blur-3xl" />
      <div className="absolute left-[35%] top-28 h-72 w-72 rounded-full bg-violet-200/70 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-fuchsia-100 blur-3xl" />
      <div className="absolute left-10 top-32 hidden text-amber-400 lg:block">
        <Sparkles className="h-8 w-8 animate-pulse" />
      </div>
      <div className="absolute right-[12%] top-28 hidden text-violet-400 lg:block">
        <Sparkles className="h-6 w-6 animate-pulse" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="text-center lg:text-left">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur lg:mx-0">
            <Globe2 className="h-4 w-4" />
            Plataforma SaaS multiempresa
          </p>

          <h1 className="text-4xl font-black leading-[1.04] tracking-tight text-[#071044] sm:text-5xl lg:text-6xl xl:text-7xl">
            Tu tienda online lista para vender{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent">
              en minutos
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base font-medium leading-8 text-[#4f5b8c] sm:text-lg lg:mx-0">
            Perla Marketplace es la plataforma todo en uno para crear,
            administrar y hacer crecer tu negocio online sin complicaciones.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href={whatsappUrl}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-7 py-4 font-black text-white shadow-xl shadow-violet-500/25 transition hover:-translate-y-1 hover:shadow-violet-500/40"
            >
              <ShoppingCart className="h-5 w-5" />
              Crear mi tienda ahora
            </a>

            <a
              href={demoUrl}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white/80 px-7 py-4 font-black text-violet-700 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-violet-400 hover:bg-white"
            >
              <Play className="h-5 w-5" />
              Ver demo
            </a>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-2xl">
            {trustItems.map((item) => (
              <div
                key={item}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-xs font-black text-[#4f5b8c] shadow-sm backdrop-blur sm:justify-start"
              >
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <DashboardMockup />
      </div>
    </section>
  );
}
