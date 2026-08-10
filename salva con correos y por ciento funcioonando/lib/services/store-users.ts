"use client";

import { supabase } from "@/lib/supabase";

export type StoreUserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
};

export type StoreUserMembership = {
  id: string;
  store_id: string;
  user_id: string;
  role: "OWNER";
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  profile: StoreUserProfile | null;
};

export type CreateStoreUserInput = {
  store_id: string;
  email: string;
  password: string;
  full_name?: string;
};

export type UpdateStoreUserInput = {
  active?: boolean;
  full_name?: string;
  password?: string;
};

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error("No hay sesión activa.");
  }

  return token;
}

export async function getStoreUsers(storeId: string) {
  try {
    const token = await getAccessToken();

    const response = await fetch(
      `/api/saas/store-users?store_id=${encodeURIComponent(storeId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return {
        data: [],
        store: null,
        error: result.error || "No se pudieron cargar los usuarios.",
      };
    }

    return {
      data: result.users as StoreUserMembership[],
      store: result.store,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return {
      data: [],
      store: null,
      error: message,
    };
  }
}

export async function createStoreUser(input: CreateStoreUserInput) {
  try {
    const token = await getAccessToken();

    const response = await fetch("/api/saas/store-users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...input,
        role: "OWNER",
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return {
        data: null,
        error: result.error || "No se pudo crear el usuario.",
      };
    }

    return {
      data: result,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return {
      data: null,
      error: message,
    };
  }
}

export async function updateStoreUser(
  membershipId: string,
  input: UpdateStoreUserInput
) {
  try {
    const token = await getAccessToken();

    const response = await fetch(`/api/saas/store-users/${membershipId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return {
        data: null,
        error: result.error || "No se pudo actualizar el usuario.",
      };
    }

    return {
      data: result,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return {
      data: null,
      error: message,
    };
  }
}
