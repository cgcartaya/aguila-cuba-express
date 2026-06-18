"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-2xl border px-4 py-3 font-semibold text-gray-700 hover:bg-gray-100"
    >
      <LogOut size={18} />
      Cerrar sesión
    </button>
  );
}