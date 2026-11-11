import { z } from "zod";

const label = z.string().trim().min(1).max(240);
export const key = z.string().regex(/^[a-z0-9-]{1,64}$/);
const requirement = z.object({ id: key, label, optional: z.boolean() }).strict();
const variant = z.object({
  id: key, title: label,
  requirements: z.array(requirement).min(1).max(30)
    .refine(items => new Set(items.map(item => item.id)).size === items.length),
}).strict();
export const configuration = z.object({
  title: label, description: z.string().trim().min(1).max(2000),
  fees: z.array(z.object({ label, amount: z.number().min(0).max(100000), unit: label }).strict()).max(20),
  agencyFee: z.number().min(0).max(100000).nullable(),
  variants: z.array(variant).min(1).max(12)
    .refine(items => new Set(items.map(item => item.id)).size === items.length),
}).strict();
export type Configuration = z.infer<typeof configuration>;
export type CatalogEntry = { service: string; version: number; configuration: Configuration };
export const answers = z.enum(["ready", "missing", "na"]);
export const states = {
  new: "Nuevo", pending: "Pendiente de documentos", review: "En revisión",
  processing: "En proceso", completed: "Completado", cancelled: "Cancelado",
} as const;
export type State = keyof typeof states;
export const transitions: Record<State, State[]> = {
  new: ["review", "pending", "cancelled"],
  pending: ["review", "cancelled"],
  review: ["pending", "processing", "cancelled"],
  processing: ["pending", "review", "completed", "cancelled"],
  completed: ["review"],
  cancelled: ["review"],
};
