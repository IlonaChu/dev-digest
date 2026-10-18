/* env.ts — the only place that reads process.env. NEXT_PUBLIC_* values are
   inlined at build time (next.config.mjs `env`), so they can't change at runtime. */
import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url().default("http://localhost:3001"),
});

export const env = EnvSchema.parse({
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
});
