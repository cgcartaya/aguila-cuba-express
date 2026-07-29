"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  LayoutDashboard,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";
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
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.99 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="absolute left-1/2 top-[calc(100%+10px)] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-[24px] border border-violet-100/90 bg-white/96 p-2.5 shadow-[0_24px_70px_rgba(67,32,128,0.17)] backdrop-blur-2xl"
    >
      <div className="grid gap-2.5 lg:grid-cols-[1fr_240px]">
        <div
          className={`grid gap-1.5 rounded-[19px] bg-white p-1.5 ${
            groups ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {groups
            ? groups.map((group) => (
                <section key={group.title} aria-label={group.title}>
                  <p className="px-3 pb-2 pt-1.5 text-xs font-black uppercase tracking-[0.17em] text-violet-500">
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
          className="group relative overflow-hidden rounded-[19px] bg-gradient-to-br from-[#10184c] via-violet-700 to-fuchsia-600 p-4 text-white outline-none ring-violet-300 transition duration-300 hover:-translate-y-0.5 focus-visible:ring-4"
        >
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-fuchsia-300/15 blur-2xl" />

          <div
            aria-hidden="true"
            className="absolute right-3 top-3 grid h-20 w-28 grid-cols-3 gap-1 rounded-xl border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-1deg]"
          >
            <div className="col-span-3 h-2 rounded-full bg-white/20" />
            <div className="col-span-2 rounded-md bg-white/15 p-1">
              <div className="flex h-full items-end gap-1">
                <span className="h-3 w-1.5 rounded-full bg-white/35" />
                <span className="h-5 w-1.5 rounded-full bg-white/50" />
                <span className="h-8 w-1.5 rounded-full bg-white/75" />
                <span className="h-6 w-1.5 rounded-full bg-white/55" />
              </div>
            </div>
            <div className="grid gap-1">
              <span className="rounded-md bg-white/20" />
              <span className="rounded-md bg-white/10" />
            </div>
          </div>

          <div className="relative flex min-h-48 flex-col justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
              <LayoutDashboard className="h-4.5 w-4.5" />
            </span>

            <div>
              <div className="mb-3 flex items-center gap-1.5 text-white/65">
                <ShoppingBag className="h-3.5 w-3.5" />
                <PackageCheck className="h-3.5 w-3.5" />
                <BarChart3 className="h-3.5 w-3.5" />
              </div>

              <p className="max-w-[190px] text-lg font-black leading-tight">
                Todo tu negocio desde una sola plataforma.
              </p>

              <span className="mt-3 inline-flex items-center gap-2 text-sm font-black">
                Explorar la plataforma
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
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
      className="group flex gap-3 rounded-xl px-3 py-2.5 outline-none transition duration-200 hover:bg-violet-50 focus-visible:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-violet-100 bg-white text-violet-600 shadow-sm transition duration-200 group-hover:-translate-y-0.5">
          <Icon className="h-4 w-4" />
        </span>
      )}

      <span className="min-w-0">
        <span className="block text-sm font-black leading-5 text-[#101a4d]">
          {item.label}
        </span>

        {item.description && (
          <span className="mt-0.5 block text-xs font-semibold leading-[1.15rem] text-[#667093]">
            {item.description}
          </span>
        )}
      </span>
    </Link>
  );
}
