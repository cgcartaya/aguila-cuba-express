import { db, lymAccess, lymFailure, lymJson, LymError } from "@/lib/lym/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId") || "";
    const access = await lymAccess(request, storeId);
    const year = Number(
      url.searchParams.get("year") || new Date().getUTCFullYear(),
    );
    const month = Number(
      url.searchParams.get("month") || new Date().getUTCMonth() + 1,
    );
    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    )
      throw new LymError("Mes inválido.");
    // Calendar bounds are computed in PostgreSQL's America/Havana timezone.
    const { data: report, error: re } = access.owner
      ? await db.rpc("lym_monthly_report", {
          p_store: storeId,
          p_actor: access.actor,
          p_year: year,
          p_month: month,
        })
      : { data: null, error: null };
    const page = Math.max(
      0,
      Math.min(100000, Number(url.searchParams.get("page") || 0) | 0),
    );
    let query = db
      .from("orders")
      .select("*,order_items(*)", { count: "exact" })
      .eq("store_id", storeId);
    const detailId = url.searchParams.get("orderId");
    if (detailId) query = query.eq("id", detailId);
    else {
      if (url.searchParams.get("trash") === "true")
        query = query.not("deleted_at", "is", null);
      else query = query.is("deleted_at", null);
      const state = url.searchParams.get("state");
      if (state) query = query.eq("lym_sale_state", state);
      const seller = url.searchParams.get("seller");
      if (seller)
        query =
          seller === "unassigned"
            ? query.is("lym_seller_key", null)
            : query.eq("lym_seller_key", seller);
    }
    const [orders, products, promoters, staff] = await Promise.all([
      query
        .order("created_at", { ascending: false })
        .range(page * 30, page * 30 + 29),
      db
        .from("products")
        .select("id,name,price,stock")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")
        .limit(10000),
      db
        .from("shareapp_members")
        .select("id,display_name,active")
        .eq("store_id", storeId)
        .order("display_name"),
      db
        .from("store_users")
        .select("user_id,role,active")
        .eq("store_id", storeId)
        .in("role", ["OWNER", "ADMIN", "LYM_SALES"]),
    ]);
    if (re || orders.error || products.error || promoters.error || staff.error)
      throw new LymError("No se pudieron cargar las ventas de LYM.", 500);
    const ids = (staff.data || []).map((x) => x.user_id);
    const { data: profiles, error: pre } = ids.length
      ? await db
          .from("profiles")
          .select("id,full_name,email,active")
          .in("id", ids)
      : { data: [], error: null };
    if (pre) throw new LymError("No se pudieron cargar los responsables.", 500);
    const sellers = [
      ...(promoters.data || []).map((x) => ({
        key: `member:${x.id}`,
        name: x.display_name,
        active: x.active,
        role: "Gestor",
      })),
      ...(staff.data || []).map((x) => {
        const p = profiles?.find((p) => p.id === x.user_id);
        return {
          key: `user:${x.user_id}`,
          name: p?.full_name || p?.email || x.user_id,
          active: x.active && p?.active,
          role:
            x.role === "LYM_SALES" ? "Tienda física" : "Jefa / Administración",
        };
      }),
    ];
    const order = detailId ? orders.data?.[0] : null;
    let audit = null;
    let actorNames: Record<string, string> = {};
    if (order) {
      const { data: events, error } = await db
        .from("lym_order_events")
        .select("actor_id,action,details,created_at")
        .eq("store_id", storeId)
        .eq("order_id", order.id)
        .order("created_at");
      if (error) throw new LymError("No se pudo cargar la trazabilidad.", 500);
      audit = events;
      const actorIds = [
        ...new Set(
          [
            order.lym_created_by,
            order.lym_confirmed_by,
            ...(events || []).map((e) => e.actor_id),
          ].filter(Boolean),
        ),
      ];
      if (actorIds.length) {
        const { data: people, error: peopleError } = await db
          .from("profiles")
          .select("id,full_name,email")
          .in("id", actorIds);
        if (peopleError)
          throw new LymError("No se pudo cargar la trazabilidad.", 500);
        actorNames = Object.fromEntries(
          (people || []).map((p) => [p.id, p.full_name || p.email]),
        );
      }
    }
    return lymJson({
      ...access,
      orders: orders.data,
      count: orders.count,
      products: products.data,
      sellers,
      report,
      audit,
      actorNames,
    });
  } catch (error) {
    return lymFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 100000)
      throw new LymError("Solicitud demasiado grande.", 413);
    const body = JSON.parse(raw);
    const access = await lymAccess(request, String(body.storeId || ""));
    const { action } = body;
    let result;
    if (action === "save") {
      result = await db.rpc("lym_save_order", {
        p_store: access.store.id,
        p_actor: access.actor,
        p_order: body.orderId || null,
        p_version: body.version ?? 0,
        p_payload: body.payload,
        p_items: body.items,
        p_public: false,
        p_request: body.orderId ? null : body.requestKey,
      });
    } else if (action === "stock") {
      result = await db.rpc("lym_adjust_stock", {
        p_store: access.store.id,
        p_actor: access.actor,
        p_product: body.productId,
        p_stock: body.stock,
        p_expected: body.expected,
        p_reason: body.reason,
      });
    } else if (
      [
        "confirm",
        "cancel",
        "trash",
        "restore",
        "legacy_deducted",
        "legacy_not_deducted",
      ].includes(action)
    ) {
      result = await db.rpc("lym_order_action", {
        p_store: access.store.id,
        p_actor: access.actor,
        p_order: body.orderId,
        p_action: action,
        p_version: body.version,
        p_reason: String(body.reason || "").slice(0, 1000),
      });
    } else throw new LymError("Acción inválida.");
    if (result.error) {
      console.error("LYM mutation:", result.error);
      // Database raises only validation messages; avoid exposing PostgreSQL internals.
      if (result.error.code === "P0001" || result.error.code === "42501")
        throw new LymError(
          result.error.message,
          result.error.code === "42501" ? 403 : 409,
        );
      throw new LymError(
        "No se pudo guardar. Revisa los datos y vuelve a cargar la orden.",
        409,
      );
    }
    if (result.data?.success === false) return lymJson(result.data);
    return lymJson({ success: true, order: result.data });
  } catch (error) {
    return lymFailure(error);
  }
}
