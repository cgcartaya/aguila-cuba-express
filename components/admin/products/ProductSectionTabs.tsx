"use client";

import Link from "next/link";
import { Boxes, FolderTree, Package, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/admin/products",
    label: "Productos",
    icon: Package,
    active: (pathname: string) =>
      pathname === "/admin/products" ||
      (pathname.startsWith("/admin/products/") &&
        !pathname.startsWith("/admin/products/featured")),
  },
  {
    href: "/admin/settings/categories",
    label: "Categorías",
    icon: FolderTree,
    active: (pathname: string) => pathname.startsWith("/admin/settings/categories"),
  },
  {
    href: "/admin/combos",
    label: "Combos",
    icon: Boxes,
    active: (pathname: string) => pathname.startsWith("/admin/combos"),
  },
  {
    href: "/admin/products/featured",
    label: "Destacados de inicio",
    icon: Sparkles,
    active: (pathname: string) => pathname.startsWith("/admin/products/featured"),
  },
];

export default function ProductSectionTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones del catálogo"
      className="mb-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
    >
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.active(pathname);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                selected
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={17} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
