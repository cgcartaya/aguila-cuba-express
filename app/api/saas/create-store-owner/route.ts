import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateStoreOwnerBody = {
  store_id?: string;
  email?: string;
  password?: string;
  full_name?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return jsonError("No se recibió token de sesión.", 401);
    }

    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !callerData.user) {
      return jsonError("Sesión inválida.", 401);
    }

    const callerId = callerData.user.id;

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,role,active")
      .eq("id", callerId)
      .maybeSingle();

    if (profileError) {
      return jsonError(profileError.message, 500);
    }

    if (!callerProfile || callerProfile.role !== "super_admin" || callerProfile.active !== true) {
      return jsonError("Solo un Super Admin puede crear usuarios de tienda.", 403);
    }

    const body = (await request.json()) as CreateStoreOwnerBody;
    const storeId = body.store_id?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const fullName = body.full_name?.trim() || null;

    if (!storeId || !email || !password) {
      return jsonError("store_id, email y password son obligatorios.");
    }

    if (password.length < 8) {
      return jsonError("La contraseña debe tener al menos 8 caracteres.");
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id,name,is_active")
      .eq("id", storeId)
      .maybeSingle();

    if (storeError) {
      return jsonError(storeError.message, 500);
    }

    if (!store) {
      return jsonError("La tienda seleccionada no existe.", 404);
    }

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
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
      return jsonError(createUserError?.message || "No se pudo crear el usuario.", 400);
    }

    const userId = createdUser.user.id;

    const { error: upsertProfileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
      role: "store_owner",
      active: true,
      updated_at: new Date().toISOString(),
    });

    if (upsertProfileError) {
      return jsonError(upsertProfileError.message, 500);
    }

    const { error: upsertStoreUserError } = await supabaseAdmin.from("store_users").upsert({
      store_id: storeId,
      user_id: userId,
      role: "owner",
      active: true,
      updated_at: new Date().toISOString(),
    });

    if (upsertStoreUserError) {
      return jsonError(upsertStoreUserError.message, 500);
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email,
        full_name: fullName,
      },
      store,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return jsonError(message, 500);
  }
}
