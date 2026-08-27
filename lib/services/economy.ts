import { supabase } from "@/lib/supabase";

export type EconomySettings = {
  module_economy_enabled: boolean;
  economy_currency: string;
  economy_target_margin: number;
};

export type ProductFinancial = {
  id?: string;
  store_id: string;
  product_id: string;
  current_unit_cost: number;
  extra_unit_cost: number;
  average_unit_cost: number;
  minimum_margin: number;
  target_margin: number;
  notes?: string | null;
};

export type EconomyProduct = {
  id: string;
  name: string;
  category: string | null;
  sku: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  image_url: string | null;
  financial: ProductFinancial | null;
};

export type EconomyExpense = {
  id: string;
  store_id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  payment_method: string | null;
  created_at: string;
};

export type EconomySnapshot = {
  sales: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  ordersCount: number;
  unitsSold: number;
  productsWithoutCost: number;
};

export async function getEconomyModuleStatus(
  storeId: string
): Promise<EconomySettings | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("module_economy_enabled,economy_currency,economy_target_margin")
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    console.error("Error loading economy module status:", error);
    return null;
  }

  if (!data) return null;

  return {
    module_economy_enabled: Boolean(data.module_economy_enabled),
    economy_currency: String(data.economy_currency || "USD"),
    economy_target_margin: Number(data.economy_target_margin ?? 30),
  };
}

export async function setEconomyModuleStatus(storeId: string, enabled: boolean) {
  return supabase
    .from("stores")
    .update({ module_economy_enabled: enabled })
    .eq("id", storeId)
    .select("id,module_economy_enabled")
    .single();
}

export async function updateEconomySettings(
  storeId: string,
  settings: { economy_currency: string; economy_target_margin: number }
) {
  return supabase
    .from("stores")
    .update(settings)
    .eq("id", storeId)
    .select("id,economy_currency,economy_target_margin")
    .single();
}

function resolveProductImage(product: any): string | null {
  const images = Array.isArray(product.product_images)
    ? product.product_images
    : [];
  const main = images.find((image: any) => image?.is_main);
  const first = [...images].sort(
    (a: any, b: any) => Number(a?.position ?? 0) - Number(b?.position ?? 0)
  )[0];
  return main?.image_url || first?.image_url || product.image_url || null;
}

export async function getEconomyProducts(storeId: string): Promise<EconomyProduct[]> {
  const [productsResult, financialsResult] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id,
        name,
        category,
        sku,
        price,
        stock,
        is_active,
        image_url,
        product_images(image_url,is_main,position)
      `)
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("product_financials")
      .select(
        "id,store_id,product_id,current_unit_cost,extra_unit_cost,average_unit_cost,minimum_margin,target_margin,notes"
      )
      .eq("store_id", storeId),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (financialsResult.error) throw financialsResult.error;

  const financialMap = new Map<string, ProductFinancial>();
  for (const row of financialsResult.data || []) {
    financialMap.set(row.product_id, {
      ...row,
      current_unit_cost: Number(row.current_unit_cost || 0),
      extra_unit_cost: Number(row.extra_unit_cost || 0),
      average_unit_cost: Number(row.average_unit_cost || 0),
      minimum_margin: Number(row.minimum_margin || 0),
      target_margin: Number(row.target_margin || 0),
    } as ProductFinancial);
  }

  return (productsResult.data || []).map((product: any) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    sku: product.sku,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    is_active: Boolean(product.is_active),
    image_url: resolveProductImage(product),
    financial: financialMap.get(product.id) || null,
  }));
}

export async function upsertProductFinancial(input: {
  storeId: string;
  productId: string;
  currentUnitCost: number;
  extraUnitCost: number;
  minimumMargin: number;
  targetMargin: number;
  notes?: string | null;
}) {
  const current = Math.max(0, Number(input.currentUnitCost || 0));
  const extra = Math.max(0, Number(input.extraUnitCost || 0));

  return supabase
    .from("product_financials")
    .upsert(
      {
        store_id: input.storeId,
        product_id: input.productId,
        current_unit_cost: current,
        extra_unit_cost: extra,
        average_unit_cost: current + extra,
        minimum_margin: Math.max(0, Number(input.minimumMargin || 0)),
        target_margin: Math.max(0, Number(input.targetMargin || 0)),
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,product_id" }
    )
    .select()
    .single();
}

export async function getEconomyExpenses(
  storeId: string,
  startDate?: string,
  endDate?: string
): Promise<EconomyExpense[]> {
  let query = supabase
    .from("economy_expenses")
    .select(
      "id,store_id,category,amount,description,expense_date,payment_method,created_at"
    )
    .eq("store_id", storeId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (startDate) query = query.gte("expense_date", startDate);
  if (endDate) query = query.lte("expense_date", endDate);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    amount: Number(row.amount || 0),
  })) as EconomyExpense[];
}

export async function createEconomyExpense(input: {
  storeId: string;
  category: string;
  amount: number;
  description?: string;
  expenseDate: string;
  paymentMethod?: string;
}) {
  return supabase
    .from("economy_expenses")
    .insert({
      store_id: input.storeId,
      category: input.category,
      amount: Math.max(0, Number(input.amount || 0)),
      description: input.description?.trim() || null,
      expense_date: input.expenseDate,
      payment_method: input.paymentMethod?.trim() || null,
    })
    .select()
    .single();
}

export async function deleteEconomyExpense(storeId: string, expenseId: string) {
  return supabase
    .from("economy_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("store_id", storeId);
}

export async function getEconomySnapshot(
  storeId: string,
  products: EconomyProduct[],
  startDate: string,
  endDate: string,
  expenses: EconomyExpense[]
): Promise<EconomySnapshot> {
  const startIso = `${startDate}T00:00:00.000Z`;
  const endIso = `${endDate}T23:59:59.999Z`;

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id,status,created_at")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (ordersError) throw ordersError;

  const orderIds = (orders || []).map((order: any) => order.id);
  if (orderIds.length === 0) {
    const expensesTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
    return {
      sales: 0,
      cogs: 0,
      grossProfit: 0,
      expenses: expensesTotal,
      netProfit: -expensesTotal,
      ordersCount: 0,
      unitsSold: 0,
      productsWithoutCost: products.filter((p) => !p.financial).length,
    };
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id,product_id,quantity,price,subtotal,base_price,item_type")
    .in("order_id", orderIds);

  if (itemsError) throw itemsError;

  const costByProduct = new Map<string, number>();
  for (const product of products) {
    const current = Number(product.financial?.current_unit_cost || 0);
    const extra = Number(product.financial?.extra_unit_cost || 0);
    costByProduct.set(product.id, current + extra);
  }

  let sales = 0;
  let cogs = 0;
  let unitsSold = 0;

  for (const item of items || []) {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const basePrice = Number(item.base_price || 0);
    const subtotal = Number(item.subtotal || 0);
    const fallbackPrice = Number(item.price || 0) * quantity;
    sales += basePrice > 0 ? basePrice * quantity : subtotal > 0 ? subtotal : fallbackPrice;
    unitsSold += quantity;

    if (item.product_id) {
      cogs += (costByProduct.get(item.product_id) || 0) * quantity;
    }
  }

  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const grossProfit = sales - cogs;

  return {
    sales,
    cogs,
    grossProfit,
    expenses: expenseTotal,
    netProfit: grossProfit - expenseTotal,
    ordersCount: orderIds.length,
    unitsSold,
    productsWithoutCost: products.filter((p) => !p.financial).length,
  };
}
