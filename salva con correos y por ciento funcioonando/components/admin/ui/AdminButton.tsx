import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type AdminButtonProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
};

export default function AdminButton({
  children,
  href,
  onClick,
  type = "button",
  disabled = false,
  icon: Icon,
  variant = "primary",
  className = "",
}: AdminButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold transition disabled:opacity-60 disabled:cursor-not-allowed";

  const styles = {
    primary: "bg-red-600 text-white shadow-lg shadow-red-900/20 hover:bg-red-700",
    secondary:
      "border border-slate-200 bg-white text-[#0B1F4D] hover:bg-blue-50 hover:border-blue-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  };

  const content = (
    <>
      {Icon && <Icon size={20} />}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${base} ${styles[variant]} ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {content}
    </button>
  );
}