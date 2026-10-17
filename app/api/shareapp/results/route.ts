import { NextRequest } from "next/server";
import { db, owner, member, json, errorResponse } from "@/lib/shareapp/server";
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get("storeId") || "";
    let memberId: string | null = null;
    if (request.nextUrl.searchParams.get("scope") === "store")
      await owner(request, storeId);
    else memberId = (await member(request, storeId)).id;
    const { data, error } = await db.rpc("shareapp_results", {
      p_store_id: storeId,
      p_member_id: memberId,
    });
    if (error) throw error;
    return json({ results: data, periodDays: 30 });
  } catch (error) {
    return errorResponse(error);
  }
}
