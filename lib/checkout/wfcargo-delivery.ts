export function getWfCargoComboDeliveryFee(items: readonly { delivery_included?: boolean | null }[]) {
  return items.some((item) => item.delivery_included !== true) ? 3 : 0;
}
