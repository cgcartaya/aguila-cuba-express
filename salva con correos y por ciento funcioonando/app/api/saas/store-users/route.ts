import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateStoreUserBody = {
  store_id?: string;
  email?: string;
  password?: string;
  full_name?: string;
  role?: "owner";
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireSuperAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return {
      ok: false as const,
      response: jsonError("No se recibió token de sesión.", 401),
    };
  }

  const { data: callerData, error: callerError } =
    await supabaseAdmin.auth.getUser(token);

  if (callerError || !callerData.user) {
    return {
      ok: false as const,
      response: jsonError("Sesión inválida.", 401),
    };
  }

  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,role,active")
    .eq("id", callerData.user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false as const,
      response: jsonError(profileError.message, 500),
    };
  }

  if (
    !callerProfile ||
    callerProfile.role !== "super_admin" ||
    callerProfile.active !== true
  ) {
    return {
      ok: false as const,
      response: jsonError(
        "Solo un Super Admin puede administrar usuarios de tienda.",
        403
      ),
    };
  }

  return {
    ok: true as const,
    user: callerData.user,
  };
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(error.message);
    }

    const user = data.users.find(
      (item) => item.email?.trim().toLowerCase() === normalizedEmail
    );

    if (user) return user;
    if (data.users.length < perPage) return null;
  }

  return null;
}

export async function GET(request: Request) {
  const access = await requireSuperAdmin(request);

  if (!access.ok) {
    return access.response;
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");

  if (!storeId) {
    return jsonError("store_id es obligatorio.");
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id,name,slug,is_active")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) {
    return jsonError(storeError.message, 500);
  }

  if (!store) {
    return jsonError("La tienda seleccionada no existe.", 404);
  }

  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from("store_users")
    .select("id,store_id,user_id,role,active,created_at,updated_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (membershipsError) {
    return jsonError(membershipsError.message, 500);
  }

  const userIds = (memberships || []).map((item) => item.user_id);

  let profiles: Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    active: boolean;
  }> = [];

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,role,active")
      .in("id", userIds);

    if (profilesError) {
      return jsonError(profilesError.message, 500);
    }

    profiles = profilesData || [];
  }

  const users = (memberships || []).map((membership) => {
    const profile = profiles.find((item) => item.id === membership.user_id);

    return {
      ...membership,
      profile: profile || null,
    };
  });

  return NextResponse.json({
    ok: true,
    store,
    users,
  });
}

export async function POST(request: Request) {
  const access = await requireSuperAdmin(request);

  if (!access.ok) {
    return access.response;
  }

  const body = (await request.json()) as CreateStoreUserBody;

  const storeId = body.store_id?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const fullName = body.full_name?.trim() || null;
  const role = body.role || "OWNER";

  if (!storeId || !email || !password) {
    return jsonError("store_id, email y password son obligatorios.");
  }

  if (role !== "OWNER") {
  return jsonError("Por ahora solo se permite el rol OWNER.");
}

  if (password.length < 8) {
    return jsonError("La contraseña debe tener al menos 8 caracteres.");
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id,name,slug,is_active")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) {
    return jsonError(storeError.message, 500);
  }

  if (!store) {
    return jsonError("La tienda seleccionada no existe.", 404);
  }

  let authUser: User | null = null;
  let reusedExistingUser = false;

  try {
    authUser = await findAuthUserByEmail(email);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "No se pudo comprobar si el usuario ya existe.",
      500
    );
  }

  if (authUser) {
    reusedExistingUser = true;

    const { data: updatedUser, error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          full_name: fullName,
          store_id: storeId,
          role: "store_owner",
        },
      });

    if (updateAuthError || !updatedUser.user) {
      return jsonError(
        updateAuthError?.message ||
          "El usuario existe, pero no se pudo actualizar su acceso.",
        500
      );
    }

    authUser = updatedUser.user;
  } else {
    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          store_id: storeId,
          role: "store_owner",
        },
      });

    if (createUserError || !createdUser.user) {
      return jsonError(
        createUserError?.message || "No se pudo crear el usuario.",
        400
      );
    }

    authUser = createdUser.user;
  }

  const userId = authUser.id;
  const now = new Date().toISOString();

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role: "store_owner",
        active: true,
        updated_at: now,
      },
      {
        onConflict: "id",
      }
    );

  if (profileError) {
    return jsonError(profileError.message, 500);
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("store_users")
    .upsert(
      {
        store_id: storeId,
        user_id: userId,
        role,
        active: true,
        updated_at: now,
      },
      {
        onConflict: "store_id,user_id",
      }
    )
    .select("id,store_id,user_id,role,active,created_at,updated_at")
    .single();

  if (membershipError) {
    return jsonError(membershipError.message, 500);
  }

  return NextResponse.json({
    ok: true,
    reused_existing_user: reusedExistingUser,
    message: reusedExistingUser
      ? "El usuario ya existía y fue asignado correctamente a la tienda."
      : "Usuario creado y asignado correctamente a la tienda.",
    store,
    user: {
      id: userId,
      email,
      full_name: fullName,
      role: "store_owner",
      active: true,
    },
    membership,
  });
}
