import { STORE_USER_ROLES, type StoreUserRole } from "@/lib/admin/access";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type UpdateStoreUserBody = {
  role?: StoreUserRole;
  active?: boolean;
  full_name?: string;
  password?: string;
};

type RouteContext = {
  params: Promise<{
    membershipId: string;
  }>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  return {
    authHeader,
    token,
  };
}

async function requireSuperAdmin(request: Request) {
  const { token } = getBearerToken(request);

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
        "Solo un Super Admin puede modificar usuarios de tienda.",
        403
      ),
    };
  }

  return {
    ok: true as const,
    user: callerData.user,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireSuperAdmin(request);

  if (!access.ok) {
    return access.response;
  }

  const { membershipId } = await context.params;

  if (!membershipId) {
    return jsonError("membershipId es obligatorio.");
  }

  const body = (await request.json()) as UpdateStoreUserBody;

  if (body.role !== undefined && !STORE_USER_ROLES.includes(body.role)) return jsonError("Rol no válido.");

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("store_users")
    .select("id,user_id,store_id,active")
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipError) {
    return jsonError(membershipError.message, 500);
  }

  if (!membership) {
    return jsonError("La relación usuario-tienda no existe.", 404);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.role !== undefined) {
    updates.role = body.role;
    updates.permissions = {};
  }

  if (typeof body.active === "boolean") {
    updates.active = body.active;
  }

  const { error: updateMembershipError } = await supabaseAdmin
    .from("store_users")
    .update(updates)
    .eq("id", membershipId);

  if (updateMembershipError) {
    return jsonError(updateMembershipError.message, 500);
  }

  const profileUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.active === "boolean") {
    profileUpdates.active = body.active;
  }

  if (typeof body.full_name === "string") {
    profileUpdates.full_name = body.full_name.trim() || null;
  }

  if (Object.keys(profileUpdates).length > 1) {
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", membership.user_id);

    if (updateProfileError) {
      return jsonError(updateProfileError.message, 500);
    }
  }

  if (body.password && body.password.trim().length > 0) {
    const password = body.password.trim();

    if (password.length < 8) {
      return jsonError("La nueva contraseña debe tener al menos 8 caracteres.");
    }

    const { error: passwordError } =
      await supabaseAdmin.auth.admin.updateUserById(membership.user_id, {
        password,
      });

    if (passwordError) {
      return jsonError(passwordError.message, 500);
    }
  }

  return NextResponse.json({
    ok: true,
  });
}
