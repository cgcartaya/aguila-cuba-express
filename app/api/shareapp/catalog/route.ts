import { NextRequest } from "next/server";
import { db, member, json, errorResponse } from "@/lib/shareapp/server";
import {
  applyPlatformFee,
  getPlatformFeePercent,
} from "@/lib/storefront/product-quantity-pricing";
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get("storeId") || "";
    const promoter = await member(request, storeId);
    const page = Math.max(
      0,
      Math.min(
        10000,
        Math.floor(Number(request.nextUrl.searchParams.get("page")) || 0),
      ),
    );
    const kind =
      request.nextUrl.searchParams.get("kind") === "combo"
        ? "combo"
        : "product";
    const query = db
      .from(kind === "combo" ? "combos" : "products")
      .select(
        kind === "combo"
          ? "id,name,description,price,image_url,combo_items(quantity,products(id,stock,is_active,store_id,deleted_at))"
          : "id,name,description,price,image_url,stock,category,product_images(image_url,is_main,position)",
      )
      .eq("store_id", storeId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name")
      .order("id")
      .range(page * 50, page * 50 + 49);
    const search = (request.nextUrl.searchParams.get("q") || "")
      .trim()
      .slice(0, 80)
      .replace(/[\\%_]/g, "");
    if (search) query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return json({
      items: (data || []).map((item) => ({
        ...item,
        price: applyPlatformFee(
          Number(item.price),
          getPlatformFeePercent(promoter.store),
        ),
      })),
      kind,
      page,
      hasMore: data?.length === 50,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
