import { pwaManifest } from "@/lib/shareapp/pwa";
export function GET() {
  return Response.json(pwaManifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
