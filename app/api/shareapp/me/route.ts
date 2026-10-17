import { NextRequest } from "next/server";
import { user, json, errorResponse } from "@/lib/shareapp/server";
export async function GET(request: NextRequest) {
  try {
    const actor = await user(request, true);
    return json({
      id: actor.id,
      email: actor.email,
      fullName: actor.fullName,
      passwordPending: actor.passwordPending,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
