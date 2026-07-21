"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

type LogoutButtonProps = {
  className?: string;
  compact?: boolean;
  onLoggedOut?: () => void;
};

export default function LogoutButton({
  className = "",
  compact = false,
  onLoggedOut,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await supabase.auth.signOut();
      onLoggedOut?.();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
      {!compact && (loading ? "Cerrando..." : "Cerrar sesión")}
    </button>
  );
}
