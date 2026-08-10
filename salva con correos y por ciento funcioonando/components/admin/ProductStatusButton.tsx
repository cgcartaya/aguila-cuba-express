"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProductStatusButton({
  productId,
  isActive,
}: {
  productId: number;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggleStatus = async () => {
    setLoading(true);

    const { error } = await supabase
      .from("products")
      .update({ is_active: !isActive })
      .eq("id", productId);

    setLoading(false);

if (error) {
  console.error("Error Supabase:", error);
  alert(error.message);
  return;
}

    router.refresh();
  };

  return (
    <button
      onClick={toggleStatus}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={16} />
          Cambiando...
        </>
      ) : isActive ? (
        <>
          <EyeOff size={16} />
          Ocultar
        </>
      ) : (
        <>
          <Eye size={16} />
          Mostrar
        </>
      )}
    </button>
  );
}