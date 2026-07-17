import type {
  StoreMembership,
  StorePermissions,
  StoreUserRole,
} from "@/lib/admin/access";

export type ShippingPermission =
  | "shipping.view"
  | "shipping.create"
  | "shipping.edit"
  | "shipping.delete"
  | "shipping.assign"
  | "shipping.change_status"
  | "shipping.import"
  | "shipping.export"
  | "shipping.manifests"
  | "shipping.billing"
  | "shipping.reports"
  | "shipping.users"
  | "shipping.settings";

const ROLE_PERMISSIONS: Record<StoreUserRole, ShippingPermission[]> = {
  OWNER: [
    "shipping.view",
    "shipping.create",
    "shipping.edit",
    "shipping.delete",
    "shipping.assign",
    "shipping.change_status",
    "shipping.import",
    "shipping.export",
    "shipping.manifests",
    "shipping.billing",
    "shipping.reports",
    "shipping.users",
    "shipping.settings",
  ],
  ADMIN: [
    "shipping.view",
    "shipping.create",
    "shipping.edit",
    "shipping.delete",
    "shipping.assign",
    "shipping.change_status",
    "shipping.import",
    "shipping.export",
    "shipping.manifests",
    "shipping.billing",
    "shipping.reports",
    "shipping.users",
    "shipping.settings",
  ],
  OPERATIONS: [
    "shipping.view",
    "shipping.create",
    "shipping.edit",
    "shipping.assign",
    "shipping.change_status",
    "shipping.import",
    "shipping.export",
    "shipping.manifests",
    "shipping.reports",
  ],
  BILLER: [
    "shipping.view",
    "shipping.billing",
    "shipping.reports",
  ],
  DISPATCHER: [
    "shipping.view",
    "shipping.assign",
    "shipping.change_status",
    "shipping.manifests",
    "shipping.export",
  ],
  DRIVER: [
    "shipping.view",
    "shipping.change_status",
  ],
  VIEWER: [
    "shipping.view",
  ],
};

export function hasShippingPermission(
  membership: StoreMembership | null,
  permission: ShippingPermission
) {
  if (!membership?.active) return false;

  const overrides = (membership.permissions || {}) as StorePermissions;

  if (typeof overrides[permission] === "boolean") {
    return overrides[permission];
  }

  return ROLE_PERMISSIONS[membership.role]?.includes(permission) ?? false;
}

export function canAccessShippingModule(
  membership: StoreMembership | null
) {
  return hasShippingPermission(membership, "shipping.view");
}

export function getRoleLabel(role?: StoreUserRole | null) {
  const labels: Record<StoreUserRole, string> = {
    OWNER: "Jefe / Propietario",
    ADMIN: "Administrador",
    OPERATIONS: "Operaciones",
    BILLER: "Facturador",
    DISPATCHER: "Despachador",
    DRIVER: "Repartidor",
    VIEWER: "Solo lectura",
  };

  return role ? labels[role] : "Super Admin";
}
