import { supabase } from "@/lib/supabase";

export type CreateStoreOwnerInput = {
  store_id: string;
  email: string;
  password: string;
  full_name?: string;
};

export async function createStoreOwner(input: CreateStoreOwnerInput) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    return { data: null, error: sessionError.message };
  }

  const token = sessionData.session?.access_token;

  if (!token) {
    return { data: null, error: "No hay sesión activa." };
  }

  const response = await fetch("/api/saas/create-store-owner", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    return { data: null, error: result.error || "No se pudo crear el usuario." };
  }

  return { data: result, error: null };
}
