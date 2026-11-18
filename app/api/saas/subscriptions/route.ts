import { createHash, randomBytes } from "node:crypto";
import { db, saasActor, json, allRows } from "@/lib/saas-billing/server";
import {
  commandSchema,
  whatsappMessage,
  whatsappPhone,
  today,
  type Invoice,
} from "@/lib/saas-billing/model";
import { invoicePdf } from "@/lib/saas-billing/pdf";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const actor = await saasActor(request);
  if (!actor)
    return json({ error: "Acceso exclusivo para administradores SaaS." }, 403);
  try {
    const url = new URL(request.url);
    const feeStoreId = url.searchParams.get("order-fixed-fee");
    if (feeStoreId !== null) {
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(feeStoreId))
        return json({ error: "Identificador de tienda inválido." }, 400);
      const { data, error } = await db
        .from("stores")
        .select("platform_order_fixed_fee")
        .eq("id", feeStoreId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Tienda no encontrada." }, 404);
      return json(data);
    }
    if (url.searchParams.has("commission-cycle")) {
      const store = url.searchParams.get("store");
      const month = url.searchParams.get("month") || "";
      if (
        (store && !/^[a-f0-9-]{36}$/i.test(store)) ||
        !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(month)
      )
        return json({ error: "Selecciona un cliente y un mes válidos." }, 400);
      const { data, error } = await db.rpc("saas_commission_cycle", {
        p_actor: actor,
        p_store: store,
        p_month: month,
      });
      if (error)
        return json(
          { error: "No se pudo cargar el ciclo de comisiones." },
          400,
        );
      return json(data);
    }
    if (url.searchParams.has("quote")) {
      const store = url.searchParams.get("store") || "";
      const month = url.searchParams.get("month") || "";
      if (
        !/^[a-f0-9-]{36}$/i.test(store) ||
        !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(month)
      )
        return json(
          { error: "Selecciona un cliente y un mes de facturación." },
          400,
        );
      const { data, error } = await db.rpc("saas_billing_preview", {
        p_actor: actor,
        p_store: store,
        p_month: month,
      });
      if (error)
        return json(
          {
            error:
              error.code === "P0001"
                ? error.message
                : "No se pudo calcular la factura.",
          },
          400,
        );
      return json(data);
    }
    const id = url.searchParams.get("pdf");
    if (id) {
      const { data, error } = await db
        .from("saas_subscription_invoices")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return json({ error: "Factura no encontrada" }, 404);
      return new Response(new Uint8Array(await invoicePdf(data as Invoice)), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${data.number || "borrador"}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    const [stores, invoices, lifecycle, settings, allPayments] =
      await Promise.all([
        allRows("stores", "name"),
        allRows("saas_subscription_invoices", "created_at"),
        allRows("saas_store_lifecycle", "store_id"),
        db
          .from("saas_billing_settings")
          .select("issuer")
          .eq("id", true)
          .single(),
        allRows("saas_subscription_payments", "created_at"),
      ]);
    if (settings.error) throw settings.error;
    const detail = url.searchParams.get("invoice");
    let payments: unknown[] = [],
      events: unknown[] = [];
    if (detail) {
      const [p, e] = await Promise.all([
        db
          .from("saas_subscription_payments")
          .select("*")
          .eq("invoice_id", detail)
          .order("created_at"),
        db
          .from("saas_billing_events")
          .select("*")
          .eq("invoice_id", detail)
          .order("created_at"),
      ]);
      if (p.error || e.error) throw p.error || e.error;
      payments = p.data;
      events = e.data;
    }
    // Store configuration is sent only after verifying the server-side SaaS role.
    return json({
      stores,
      invoices,
      lifecycle,
      issuer: settings.data.issuer,
      payments,
      events,
      allPayments,
    });
  } catch (error) {
    console.error("SaaS billing read", error);
    return json(
      {
        error:
          "No se pudo cargar la facturación SaaS. Comprueba que su migración esté aplicada.",
      },
      503,
    );
  }
}
export async function POST(request: Request) {
  const actor = await saasActor(request);
  if (!actor)
    return json({ error: "Acceso exclusivo para administradores SaaS." }, 403);
  try {
    const parsed = commandSchema.safeParse(await request.json());
    if (!parsed.success)
      return json(
        { error: "Datos no válidos", details: parsed.error.flatten() },
        400,
      );
    const command = parsed.data;
    if (command.action === "create" && command.due_on < command.issued_on)
      return json(
        { error: "Revisa las fechas y el total de la factura." },
        400,
      );
    if (command.action === "pay" && command.paid_on > today())
      return json(
        { error: "La fecha de pago no puede estar en el futuro." },
        400,
      );
    let token: string | undefined;
    if (command.action === "share") {
      whatsappPhone(command.phone);
      token = randomBytes(32).toString("hex");
    }
    const { data, error } = await db.rpc("saas_billing_command", {
      p_actor: actor,
      p_action: command.action,
      p_data: {
        ...command,
        ...(token
          ? { token_hash: createHash("sha256").update(token).digest("hex") }
          : {}),
      },
    });
    if (error) {
      console.error("SaaS billing command", error);
      return json(
        {
          error:
            error.code === "P0001"
              ? error.message
              : "No se pudo guardar. Revisa los datos o vuelve a intentar la misma operación.",
        },
        400,
      );
    }
    if (token && command.action === "share") {
      // Use configured canonical origin, never an untrusted Host header.
      const origin =
        process.env.SAAS_BILLING_PUBLIC_ORIGIN ||
        "https://perlamarketplace.com";
      const link = new URL(
        `/api/saas/subscriptions/share/${token}`,
        origin,
      ).toString();
      return json({
        invoice: data,
        link,
        message: whatsappMessage(data as Invoice, link),
        phone: whatsappPhone(command.phone),
      });
    }
    return json({ invoice: data });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error && /internacional|WhatsApp/.test(error.message)
            ? error.message
            : "Solicitud no válida.",
      },
      400,
    );
  }
}
