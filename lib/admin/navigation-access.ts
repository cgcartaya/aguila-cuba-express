import { isAssignmentOnlyPath, type StoreMembership } from "@/lib/admin/access";
import {
  hasShippingPermission,
  type ShippingPermission,
} from "@/lib/shipping/permissions";

/** Navigation mirrors existing role restrictions; it never grants a permission. */
export function canAccessAdminPath(
  pathname: string,
  membership: StoreMembership | null,
  isSuperAdmin = false,
) {
  if (isSuperAdmin) return true;
  if (!membership?.active) return false;
  if (["ASSIGNER", "SHIPPING_CATALOG", "LYM_SALES"].includes(membership.role)) {
    return isAssignmentOnlyPath(pathname, membership.role);
  }
  const path = pathname.replace(/\/$/, "");
  if (
    path === "/admin/sales" ||
    path.startsWith("/admin/sales/") ||
    path === "/admin/marketing/gestores" ||
    path.startsWith("/admin/marketing/gestores/")
  )
    return ["OWNER", "ADMIN"].includes(membership.role);
  if (path === "/admin/casillero" || path.startsWith("/admin/casillero/"))
    return ["OWNER", "ADMIN", "OPERATIONS"].includes(membership.role);
  if (path === "/admin/folios" || path.startsWith("/admin/folios/"))
    return ["OWNER", "ADMIN", "OPERATIONS"].includes(membership.role);
  let permission: ShippingPermission | null = null;
  if (path === "/admin/customers" || path.startsWith("/admin/customers/"))
    permission = "shipping.view";
  else if (
    path === "/admin/shipping/settings" ||
    path.startsWith("/admin/shipping/settings/")
  )
    permission = "shipping.settings";
  else if (
    path === "/admin/shipping/staff" ||
    path.startsWith("/admin/shipping/staff/")
  )
    permission = "shipping.users";
  else if (
    path === "/admin/shipping/remittances" ||
    path.startsWith("/admin/shipping/remittances/")
  )
    permission = "shipping.billing";
  else if (path === "/admin/shipping" || path.startsWith("/admin/shipping/"))
    permission = "shipping.view";
  return !permission || hasShippingPermission(membership, permission);
}
