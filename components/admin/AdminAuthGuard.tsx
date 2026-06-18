"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    };

    checkSession();
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" size={22} />
          Verificando acceso...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}