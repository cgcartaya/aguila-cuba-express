"use client";

import { supabase } from "@/lib/supabase";

export type EconomySupplier = {
  id: string; store_id: string; name: string; contact_name: string | null;
  phone: string | null; email: string | null; address: string | null;
  notes: string | null; is_active: boolean; created_at: string;
};

export type PurchaseProduct = { id: string; name: string; sku: string | null; stock: number; price: number };

export type PurchaseItem = {
  id: string; purchase_id: string; store_id: string; product_id: string;
  quantity: number; unit_cost: number; line_subtotal: number;
  allocated_extra_cost: number; landed_unit_cost: number;
  previous_average_cost: number; new_average_cost: number;
  products?: { id: string; name: string; sku: string | null } | null;
};

export type InventoryPurchase = {
  id: string; store_id: string; supplier_id: string | null; purchase_date: string;
  reference: string | null; status: "draft" | "confirmed" | "cancelled";
  merchandise_total: number; shipping_cost: number; customs_cost: number; other_costs: number;
  total_amount: number; notes: string | null; confirmed_at: string | null; created_at: string;
  economy_suppliers?: { id: string; name: string } | null;
  inventory_purchase_items?: PurchaseItem[];
};

export async function getEconomySuppliers(storeId: string): Promise<EconomySupplier[]> {
  const { data, error } = await supabase.from("economy_suppliers")
    .select("id,store_id,name,contact_name,phone,email,address,notes,is_active,created_at")
    .eq("store_id", storeId).order("is_active", { ascending: false }).order("name", { ascending: true });
  if (error) throw error;
  return (data || []) as EconomySupplier[];
}

export async function createEconomySupplier(storeId: string, input: {
  name: string; contactName?: string; phone?: string; email?: string; address?: string; notes?: string;
}) {
  return supabase.from("economy_suppliers").insert({
    store_id: storeId, name: input.name.trim(),
    contact_name: input.contactName?.trim() || null,
    phone: input.phone?.trim() || null, email: input.email?.trim() || null,
    address: input.address?.trim() || null, notes: input.notes?.trim() || null,
  }).select().single();
}

export async function updateEconomySupplier(storeId: string, supplierId: string, input: {
  name: string; contactName?: string; phone?: string; email?: string; address?: string; notes?: string; isActive: boolean;
}) {
  return supabase.from("economy_suppliers").update({
    name: input.name.trim(), contact_name: input.contactName?.trim() || null,
    phone: input.phone?.trim() || null, email: input.email?.trim() || null,
    address: input.address?.trim() || null, notes: input.notes?.trim() || null,
    is_active: input.isActive, updated_at: new Date().toISOString(),
  }).eq("id", supplierId).eq("store_id", storeId).select().single();
}

export async function getPurchaseProducts(storeId: string): Promise<PurchaseProduct[]> {
  const { data, error } = await supabase.from("products")
    .select("id,name,sku,stock,price").eq("store_id", storeId)
    .is("deleted_at", null).order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id, name: r.name, sku: r.sku,
    stock: Number(r.stock || 0), price: Number(r.price || 0),
  }));
}

export async function getInventoryPurchases(storeId: string): Promise<InventoryPurchase[]> {
  const { data, error } = await supabase.from("inventory_purchases").select(`
    id,store_id,supplier_id,purchase_date,reference,status,merchandise_total,
    shipping_cost,customs_cost,other_costs,total_amount,notes,confirmed_at,created_at,
    economy_suppliers:supplier_id(id,name),
    inventory_purchase_items(
      id,purchase_id,store_id,product_id,quantity,unit_cost,line_subtotal,
      allocated_extra_cost,landed_unit_cost,previous_average_cost,new_average_cost,
      products:product_id(id,name,sku)
    )
  `).eq("store_id", storeId).order("purchase_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    merchandise_total: Number(row.merchandise_total || 0),
    shipping_cost: Number(row.shipping_cost || 0),
    customs_cost: Number(row.customs_cost || 0),
    other_costs: Number(row.other_costs || 0),
    total_amount: Number(row.total_amount || 0),
    inventory_purchase_items: (row.inventory_purchase_items || []).map((i: any) => ({
      ...i, quantity: Number(i.quantity || 0), unit_cost: Number(i.unit_cost || 0),
      line_subtotal: Number(i.line_subtotal || 0),
      allocated_extra_cost: Number(i.allocated_extra_cost || 0),
      landed_unit_cost: Number(i.landed_unit_cost || 0),
      previous_average_cost: Number(i.previous_average_cost || 0),
      new_average_cost: Number(i.new_average_cost || 0),
    })),
  })) as InventoryPurchase[];
}

export async function createPurchaseDraft(storeId: string, input: {
  supplierId?: string | null; purchaseDate: string; reference?: string;
  shippingCost: number; customsCost: number; otherCosts: number; notes?: string;
  items: Array<{ productId: string; quantity: number; unitCost: number }>;
}) {
  const merchandiseTotal = input.items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitCost || 0), 0);
  const extras = Number(input.shippingCost || 0) + Number(input.customsCost || 0) + Number(input.otherCosts || 0);

  const { data: purchase, error: purchaseError } = await supabase.from("inventory_purchases").insert({
    store_id: storeId, supplier_id: input.supplierId || null, purchase_date: input.purchaseDate,
    reference: input.reference?.trim() || null, status: "draft",
    merchandise_total: merchandiseTotal, shipping_cost: Math.max(0, Number(input.shippingCost || 0)),
    customs_cost: Math.max(0, Number(input.customsCost || 0)), other_costs: Math.max(0, Number(input.otherCosts || 0)),
    total_amount: merchandiseTotal + extras, notes: input.notes?.trim() || null,
  }).select("id").single();

  if (purchaseError || !purchase) return { data: null, error: purchaseError };

  const rows = input.items.map((i) => {
    const q = Math.max(1, Math.trunc(Number(i.quantity || 1)));
    const c = Math.max(0, Number(i.unitCost || 0));
    return { purchase_id: purchase.id, store_id: storeId, product_id: i.productId, quantity: q, unit_cost: c, line_subtotal: q * c };
  });

  const { error: itemsError } = await supabase.from("inventory_purchase_items").insert(rows);
  if (itemsError) {
    await supabase.from("inventory_purchases").delete().eq("id", purchase.id).eq("store_id", storeId);
    return { data: null, error: itemsError };
  }
  return { data: purchase, error: null };
}

export async function confirmInventoryPurchase(purchaseId: string) {
  return supabase.rpc("confirm_inventory_purchase", { p_purchase_id: purchaseId });
}

export async function deletePurchaseDraft(storeId: string, purchaseId: string) {
  return supabase.from("inventory_purchases").delete()
    .eq("id", purchaseId).eq("store_id", storeId).eq("status", "draft");
}

export async function getProductCostHistory(storeId: string, productId: string) {
  const { data, error } = await supabase.from("inventory_cost_entries")
    .select("id,purchased_at,quantity,unit_cost,extra_cost,landed_unit_cost,previous_average_cost,new_average_cost,supplier_name,purchase_id,created_at")
    .eq("store_id", storeId).eq("product_id", productId)
    .order("purchased_at", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r, quantity: Number(r.quantity || 0), unit_cost: Number(r.unit_cost || 0),
    extra_cost: Number(r.extra_cost || 0), landed_unit_cost: Number(r.landed_unit_cost || 0),
    previous_average_cost: Number(r.previous_average_cost || 0), new_average_cost: Number(r.new_average_cost || 0),
  }));
}
