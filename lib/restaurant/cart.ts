import type { MenuCartLine, MenuItem } from '@/lib/menu/types';
/** Only live menu IDs can survive restoration; store products and combos have no menu_item_id. */
export function reconcileRestaurantCart(cart: MenuCartLine[], items: MenuItem[]): MenuCartLine[] {
  const catalog = new Map(items.map(item => [item.id, item]));
  return cart.flatMap(line => {
    const item = catalog.get(line.menu_item_id);
    if (!item?.is_active) return [];
    const options = line.selected_options.map(selected => {
      const group = item.menu_item_option_groups.find(group => group.id === selected.group_id);
      const option = group?.menu_item_options.find(option => option.id === selected.option_id && option.is_available !== false);
      return group && option ? { group_id: group.id, group_name: group.name, option_id: option.id, option_label: option.label, price_delta: Number(option.price_delta) } : null;
    });
    if (options.some(option => !option)) return [];
    if (item.menu_item_option_groups.some(group => group.is_required && !options.some(option => option?.group_id === group.id))) return [];
    return [{ ...line, name: item.name, quantity: Math.min(50, line.quantity), unit_base_price: Number(item.price), selected_options: options as MenuCartLine['selected_options'] }];
  });
}
