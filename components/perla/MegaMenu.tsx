"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, LayoutDashboard } from "lucide-react";
import type { NavigationGroup, NavigationItem } from "./navigation";

type MegaMenuProps = {
  id: string;
  groups?: NavigationGroup[];
  items?: NavigationItem[];
  onNavigate: () => void;
};

export default function MegaMenu({
  id,
  groups,
  items,
  onNavigate,
}: MegaMenuProps) {
  return (
    <motion.div
      id={id}
      role="menu"
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.99 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute left-1/2 top-[calc(100%+1px)] w-[min(1160px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-b-[28px] rounded-t-[18px] border border-slate-200/90 bg-white p-5 shadow-[0_30px_85px_rgba(15,23,42,0.18)]"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div
          className={`grid gap-0 divide-x divide-slate-200 ${
            groups ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {groups
            ? groups.map((group) => (
                <section key={group.title} className="px-5 first:pl-1 last:pr-1">
                  <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-violet-700">
                    <span className="h-8 w-8 rounded-xl bg-violet-50 ring-1 ring-violet-100" />
                    {group.title}
                  </p>

                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <MenuLink
                        key={item.label}
                        item={item}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                </section>
              ))
            : items?.map((item) => (
                <div key={item.label} className="px-4">
                  <MenuLink item={item} onNavigate={onNavigate} />
                </div>
              ))}
        </div>

        <Link
          href="#caracteristicas"
          role="menuitem"
          onClick={onNavigate}
          className="group relative min-h-[430px] overflow-hidden rounded-[22px] bg-gradient-to-br from-[#17145f] via-[#4f24d8] to-[#8b2cff] p-6 text-white outline-none transition duration-300 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-violet-300"
        >
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-fuchsia-300/20 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <LayoutDashboard className="h-5 w-5" />
            </span>

            <h3 className="mt-7 max-w-[245px] text-2xl font-black leading-tight">
              Todo tu negocio desde una sola plataforma.
            </h3>

            <span className="mt-4 inline-flex items-center gap-2 text-sm font-black">
              Explorar la plataforma
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>

            <DashboardPreview />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}

function MenuLink({
  item,
  onNavigate,
}: {
  item: NavigationItem;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      role="menuitem"
      onClick={onNavigate}
      className="group flex gap-3 rounded-2xl px-3 py-3 outline-none transition duration-200 hover:bg-violet-50 focus-visible:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100 transition duration-200 group-hover:-translate-y-0.5 group-hover:bg-white">
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0">
        <span className="block text-[15px] font-black leading-5 text-[#10152f]">
          {item.label}
        </span>
        <span className="mt-1 block text-[13px] font-medium leading-5 text-slate-600">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="mt-auto overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-[11px] font-black text-[#151936]">
        <BarChart3 className="h-4 w-4 text-violet-600" />
        Dashboard
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        {[
          ["Ventas", "$13,981"],
          ["Pedidos", "536"],
          ["Clientes", "854"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-2">
            <p className="text-[9px] font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-[12px] font-black text-[#151936]">{value}</p>
            <p className="mt-1 text-[8px] font-bold text-emerald-600">↑ 8.2%</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.25fr_1fr] gap-2 px-3 pb-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex h-20 items-end gap-1.5">
            {[28, 43, 35, 62, 48, 76, 60].map((height, index) => (
              <span
                key={index}
                className="flex-1 rounded-t bg-gradient-to-t from-violet-500 to-fuchsia-400"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center justify-between gap-2">
              <span className="h-2 w-12 rounded-full bg-slate-200" />
              <span className="text-[8px] font-black text-slate-500">
                ${item * 45}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
