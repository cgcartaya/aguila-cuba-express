import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendNewOrderEmail } from "@/lib/notifications/order-email";

type NewOrderNotificationParams = {
  storeId: string;
  storeName: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  itemsCount: number;
  isLocalDelivery: boolean;
  municipality: string;
};

/**
 * Trabajo secundario de una orden ya creada.
 *
 * Se ejecuta desde Next.js `after()` para que ni la lectura de
 * store_settings ni la llamada externa a Resend aumenten el tiempo que
 * el comprador espera por la respuesta de /api/checkout/create-order.
 *
 * Esta función absorbe sus propios errores deliberadamente: una falla de
 * notificación nunca debe convertir una orden válida en un checkout fallido.
 */
export async function sendNewOrderNotification(
  params: NewOrderNotificationParams
) {
  try {
    const { data: notificationSettings, error: settingsError } =
      await supabaseAdmin
        .from("store_settings")
        .select("order_notification_email")
        .eq("store_id", params.storeId)
        .maybeSingle();

    if (settingsError) {
      console.error(
        "Error leyendo email de notificación de la tienda:",
        settingsError
      );
    }

    const storeEmail = String(
      notificationSettings?.order_notification_email || ""
    )
      .trim()
      .toLowerCase();

    const platformEmail = String(
      process.env.PLATFORM_NOTIFICATION_EMAIL || ""
    )
      .trim()
      .toLowerCase();

    const recipients = Array.from(
      new Set([storeEmail, platformEmail].filter(Boolean))
    );

    if (recipients.length === 0) return;

    await sendNewOrderEmail({
      toEmails: recipients,
      storeName: params.storeName,
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      total: params.total,
      itemsCount: params.itemsCount,
      isLocalDelivery: params.isLocalDelivery,
      municipality: params.municipality,
    });
  } catch (notificationError) {
    console.error(
      "Error enviando notificación de nueva orden (no afecta la orden):",
      notificationError
    );
  }
}
