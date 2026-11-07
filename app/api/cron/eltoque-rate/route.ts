import { NextResponse } from "next/server";

// Retired: no external requests or rate changes, even if an old caller retries.
export async function GET() {
  return NextResponse.json(
    { enabled: false, message: "La actualización automática de elTOQUE está desactivada." },
    { status: 410 }
  );
}
