import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type AdminPageHeaderProps = {
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
};

export default function AdminPageHeader({
  title,
  description,
  badge,
  icon: Icon,
  actionLabel = "Ver tienda",
  actionHref = "/tienda",
}: AdminPageHeaderProps) {
  return (
    <section className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0B1F4D] via-[#123D8D] to-[#2563EB] p-8 text-white shadow-xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100 ring-1 ring-white/15">
            <Icon size={16} />
            {badge}
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            {title}
          </h1>

          <p className="mt-3 max-w-2xl text-blue-100">
            {description}
          </p>
        </div>

        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700"
          >
            {actionLabel}
            <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </section>
  );
}