import { createHash, createHmac } from "node:crypto";
export const normalizeEmail = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();
export const validEmail = (email: string) =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export { validPassword } from "./password-policy";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const temporaryDigest = (
  userId: string,
  password: string,
  secret: string,
) => createHmac("sha256", secret).update(`${userId}:${password}`).digest("hex");
