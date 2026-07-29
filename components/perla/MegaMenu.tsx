"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard } from "lucide-react";
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
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.985 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute left-1/2 top-[calc(100%+14px)] w-[min(920px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-[28px] border border-violet-100/90 bg-white/95 p-3 shadow-[0_28px_90px_rgba(67,32,128,0.18)] backdrop-blur-2xl"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_245px]">
        <div
          className={`grid gap-2 rounded-[22px] bg-white p-2 ${
            groups ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {groups
            ? groups.map((group) => (
                <section key={group.title} aria-label={group.title}>
                  <p className="px-3 pb-2 pt-1 text-xs font-black uppercase tracking-[0.16em] text-violet-500">
                    {group.title}
                  </p>
                  <div className="space-y-1">
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
                <MenuLink
                  key={item.label}
                  item={item}
                  onNavigate={onNavigate}
                />
              ))}
        </div>

        <Link
          href="#caracteristicas"
          role="menuitem"
          onClick={onNavigate}
          className="group relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#11194f] via-violet-700 to-fuchsia-600 p-5 text-white outline-none ring-violet-300 transition focus-visible:ring-4"
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex h-full min-h-48 flex-col justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <LayoutDashboard className="h-5 w-5" />
            </span>

            <div>
              <p className="text-lg font-black leading-tight">
                Todo tu negocio desde una sola plataforma.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-black">
                Explorar la plataforma
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
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
      className="group flex gap-3 rounded-2xl p-3 outline-none transition hover:bg-violet-50 focus-visible:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white text-violet-600 shadow-sm transition group-hover:-translate-y-0.5">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span>
        <span className="block text-sm font-black text-[#101a4d]">
          {item.label}
        </span>
        {item.description && (
          <span className="mt-1 block text-xs font-semibold leading-5 text-[#596389]">
            {item.description}
          </span>
        )}
      </span>
    </Link>
  );
}
