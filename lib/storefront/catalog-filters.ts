import { weightInPounds } from "@/lib/shipping/product-weight";
import type { Product } from "@/types/cart";
import { getUnitPriceForQuantity } from "./product-quantity-pricing";

type ProductWeight = Pick<Product, "weight" | "weight_unit">;

export const catalogWeightRanges = [
  { min: 0, max: 2, label: "0 a menos de 2 lb" },
  { min: 2, max: 5, label: "2 a menos de 5 lb" },
  { min: 5, max: 10, label: "5 a menos de 10 lb" },
  { min: 10, max: 20, label: "10 a menos de 20 lb" },
  { min: 20, max: Infinity, label: "20 lb o más" },
];

export function catalogWeightLb(product: ProductWeight) {
  try {
    return weightInPounds(product.weight, product.weight_unit);
  } catch {
    return null;
  }
}

const weightFormat = new Intl.NumberFormat("es-US", {
  maximumFractionDigits: 6,
});

export function catalogWeightLabel(product: ProductWeight) {
  const weight = catalogWeightLb(product);
  return weight === null ? null : `${weightFormat.format(weight)} lb`;
}

export function filterCatalog(
  products: Product[],
  range: (typeof catalogWeightRanges)[number] | undefined,
  sortByPrice: boolean,
  feePercent: number,
) {
  const matching = range
    ? products.filter((product) => {
        const weight = catalogWeightLb(product);
        return weight !== null && weight >= range.min && weight < range.max;
      })
    : products;

  if (!sortByPrice) return matching;

  return matching
    .map((product) => ({
      product,
      price: getUnitPriceForQuantity(
        Number(product.price),
        1,
        product.product_price_tiers ?? [],
        product.platform_fee_exempt ? 0 : feePercent,
      ),
    }))
    .sort((a, b) => a.price - b.price)
    .map(({ product }) => product);
}
