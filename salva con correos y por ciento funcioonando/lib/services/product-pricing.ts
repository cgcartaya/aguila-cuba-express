import { supabase } from "@/lib/supabase";

export type ProductPriceTier = {
  id: string;
  store_id: string;
  product_id: string;
  min_quantity: number;
  unit_price: number;
  created_at?: string;
};

export type ProductPriceTierDraft = {
  key: string;
  min_quantity: string;
  unit_price: string;
};

export type ProductPriceTierInput = {
  min_quantity: number;
  unit_price: number;
};

export function createPriceTierDraft(
  minQuantity = "",
  unitPrice = ""
): ProductPriceTierDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    min_quantity: minQuantity,
    unit_price: unitPrice,
  };
}

export function normalizePriceTierDrafts(
  drafts: ProductPriceTierDraft[],
  basePrice: number
): {
  data: ProductPriceTierInput[];
  error: string | null;
} {
  const parsed: ProductPriceTierInput[] = [];

  for (const draft of drafts) {
    const quantityText = draft.min_quantity.trim();
    const priceText = draft.unit_price.trim();

    // Una fila completamente vacía no cuenta como regla.
    if (!quantityText && !priceText) continue;

    const minQuantity = Number(quantityText);
    const unitPrice = Number(priceText);

    if (
      !Number.isInteger(minQuantity) ||
      minQuantity < 2
    ) {
      return {
        data: [],
        error:
          "Cada escala debe comenzar desde 2 unidades o más.",
      };
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return {
        data: [],
        error:
          "Cada escala debe tener un precio unitario válido.",
      };
    }

    if (unitPrice >= basePrice) {
      return {
        data: [],
        error:
          "El precio por cantidad debe ser menor que el precio normal del producto.",
      };
    }

    parsed.push({
      min_quantity: minQuantity,
      unit_price: Number(unitPrice.toFixed(2)),
    });
  }

  const quantities = parsed.map((tier) => tier.min_quantity);

  if (new Set(quantities).size !== quantities.length) {
    return {
      data: [],
      error:
        "No puedes repetir la misma cantidad mínima en dos escalas.",
    };
  }

  parsed.sort((a, b) => a.min_quantity - b.min_quantity);

  return {
    data: parsed,
    error: null,
  };
}

async function productBelongsToStore(
  productId: string,
  storeId: string
) {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  return {
    ok: Boolean(data) && !error,
    error,
  };
}

export async function getProductPriceTiers(
  productId: string,
  storeId: string
) {
  const productCheck = await productBelongsToStore(
    productId,
    storeId
  );

  if (!productCheck.ok) {
    return {
      data: [] as ProductPriceTier[],
      error:
        productCheck.error || {
          message:
            "El producto no pertenece a la tienda activa.",
        },
    };
  }

  return supabase
    .from("product_price_tiers")
    .select(
      "id, store_id, product_id, min_quantity, unit_price, created_at"
    )
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .order("min_quantity", { ascending: true });
}

export async function replaceProductPriceTiers(
  productId: string,
  storeId: string,
  tiers: ProductPriceTierInput[]
) {
  const productCheck = await productBelongsToStore(
    productId,
    storeId
  );

  if (!productCheck.ok) {
    return {
      data: null,
      error:
        productCheck.error || {
          message:
            "El producto no pertenece a la tienda activa.",
        },
    };
  }

  const { error: deleteError } = await supabase
    .from("product_price_tiers")
    .delete()
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (deleteError) {
    return {
      data: null,
      error: deleteError,
    };
  }

  if (tiers.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  return supabase
    .from("product_price_tiers")
    .insert(
      tiers.map((tier) => ({
        store_id: storeId,
        product_id: productId,
        min_quantity: tier.min_quantity,
        unit_price: tier.unit_price,
      }))
    )
    .select(
      "id, store_id, product_id, min_quantity, unit_price, created_at"
    );
}
