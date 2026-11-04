import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyCloverSignature(raw: string, header: string, secret: string, now = Date.now()) {
  const parts = header.split(",").map(part => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1] || "";
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest();
  return parts.filter(([key]) => key === "v1").some(([, value]) => {
    if (!/^[a-f\d]{64}$/i.test(value || "")) return false;
    return timingSafeEqual(expected, Buffer.from(value, "hex"));
  });
}
