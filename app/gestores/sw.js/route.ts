import { serviceWorker } from "@/lib/shareapp/pwa";
export function GET() {
  return new Response(serviceWorker, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, max-age=0",
      "Service-Worker-Allowed": "/gestores",
    },
  });
}
