import { NextResponse } from "next/server";
// Both values are already public in the storefront browser bundle. Never return
// the service-role key or attribution signing secret from this endpoint.
export function GET() {
  return NextResponse.json(
    {
      apiVersion: 1,
      authUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
