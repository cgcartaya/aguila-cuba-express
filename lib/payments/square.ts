import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type SquareEnvironment = "sandbox" | "production";

export const squareScopes = [
  "MERCHANT_PROFILE_READ",
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PAYMENTS_READ",
  "PAYMENTS_WRITE",
];

export function squareConfig(environment: SquareEnvironment) {
  const prefix = environment === "sandbox" ? "SQUARE_SANDBOX_" : "SQUARE_PRODUCTION_";
  const applicationId = process.env[prefix + "APPLICATION_ID"];
  const applicationSecret = process.env[prefix + "APPLICATION_SECRET"];
  const redirectUri = process.env[prefix + "REDIRECT_URI"];
  if (!applicationId || !applicationSecret || !redirectUri || new URL(redirectUri).protocol !== "https:") {
    throw new Error("La aplicación Square no está configurada.");
  }
  return {
    applicationId,
    applicationSecret,
    redirectUri,
    base: environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com",
  };
}

function encryptionKey() {
  const value = process.env.SQUARE_TOKEN_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("Clave de cifrado Square inválida.");
  return Buffer.from(value, "hex");
}

export function encryptSquareToken(token: string, context: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptSquareToken(envelope: string, context: string) {
  const [nonce, tag, ciphertext] = envelope.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), nonce);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function createSquareState() {
  return randomBytes(32).toString("base64url");
}

export function hashSquareState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function verifySquareSignature(rawBody: string, signature: string, endpoint: string, key: string) {
  if (!key || !/^https:\/\//.test(endpoint) || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = createHmac("sha256", key).update(endpoint).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "base64"));
}

export async function squareRequest<T>(environment: SquareEnvironment, path: string, options: {
  method?: "POST" | "GET" | "DELETE";
  authorization?: string;
  body?: object;
} = {}) {
  const { base } = squareConfig(environment);
  const response = await fetch(base + path, {
    method: options.method ?? "GET",
    headers: {
      "Square-Version": "2026-09-16",
      "Content-Type": "application/json",
      ...(options.authorization ? { Authorization: options.authorization } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Square respondió con estado ${response.status}.`);
  return await response.json() as T;
}

export interface SquareTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  merchant_id: string;
}

export async function obtainSquareTokens(environment: SquareEnvironment, grant:
  { code: string } | { refreshToken: string },
) {
  const config = squareConfig(environment);
  const tokens = await squareRequest<SquareTokens>(environment, "/oauth2/token", {
    method: "POST",
    body: {
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      ...("code" in grant
        ? { grant_type: "authorization_code", code: grant.code, redirect_uri: config.redirectUri }
        : { grant_type: "refresh_token", refresh_token: grant.refreshToken }),
    },
  });
  if (!tokens.access_token || !tokens.refresh_token || !tokens.merchant_id || !(Date.parse(tokens.expires_at) > Date.now())) {
    throw new Error("Square devolvió credenciales incompletas.");
  }
  return tokens;
}

export async function verifySquareConnection(environment: SquareEnvironment, tokens: Pick<SquareTokens, "access_token" | "merchant_id">) {
  const authorization = `Bearer ${tokens.access_token}`;
  const { applicationId } = squareConfig(environment);
  const [status, data, merchant] = await Promise.all([
    squareRequest<{ scopes: string[]; merchant_id: string; client_id: string }>(environment, "/oauth2/token/status", { method: "POST", authorization }),
    squareRequest<{ locations?: { id: string; name: string; status: string; currency: string; capabilities?: string[] }[] }>(environment, "/v2/locations", { authorization }),
    squareRequest<{ merchant: { business_name?: string } }>(environment, `/v2/merchants/${encodeURIComponent(tokens.merchant_id)}`, { authorization }),
  ]);
  if (status.merchant_id !== tokens.merchant_id || status.client_id !== applicationId || !squareScopes.every((scope) => status.scopes.includes(scope))) {
    throw new Error("La autorización Square es incompleta.");
  }
  return {
    merchantName: merchant.merchant.business_name ?? null,
    locations: (data.locations ?? []).filter((location) => location.status === "ACTIVE" &&
      location.currency === "USD" && location.capabilities?.includes("CREDIT_CARD_PROCESSING")),
  };
}
