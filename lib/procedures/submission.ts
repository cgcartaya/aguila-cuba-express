import { z } from "zod";
import { normalizeProcedurePhone } from "./phone";
import { answers, key, type CatalogEntry } from "./catalog";
export const submission = z.object({
  service: key, variant: key, version: z.number().int().positive(),
  name: z.string().trim().min(1).max(120).regex(/^[\p{L}\p{M} .'’-]+$/u),
  phone: z.string().max(30).transform(normalizeProcedurePhone).pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/)),
  email: z.string().trim().email().max(254).or(z.literal("")),
  whatsapp: z.boolean(), checklist: z.record(key, answers),
}).strict();

export function requestValues(input: z.infer<typeof submission>, entry?: CatalogEntry) {
  const variant = entry?.configuration.variants.find(item => item.id === input.variant);
  if (!entry || entry.version !== input.version || !variant ||
      (entry.configuration.emailRequired !== false && !input.email) ||
      Object.keys(input.checklist).length !== variant.requirements.length ||
      variant.requirements.some(item => !input.checklist[item.id] || (!item.optional && input.checklist[item.id] === "na"))) return null;
  return { service: entry.service, version: entry.version, variant: variant.id,
    customer_name: input.name, phone: input.phone, email: input.email, whatsapp_opt_in: input.whatsapp,
    checklist: variant.requirements.map(item => ({ ...item, answer: input.checklist[item.id], verification: "pending" })) };
}
