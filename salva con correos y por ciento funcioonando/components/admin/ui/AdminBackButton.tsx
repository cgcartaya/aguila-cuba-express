import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type AdminBackButtonProps = {
  href?: string;
  label?: string;
};

export default function AdminBackButton({
  href = "/admin/settings",
  label = "Volver a ajustes",
}: AdminBackButtonProps) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md"
    >
      <ArrowLeft size={18} />
      {label}
    </Link>
  );
}