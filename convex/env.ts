import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Convex deployment env vars, set with `npx convex env set`. They are validated
// when a function reads them, not at import, so a push never fails on a missing key.

export const openRouterEnv = () =>
  createEnv({
    server: {
      OPENROUTER_API_KEY: z.string().min(1),
      OPENROUTER_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
  });

export const adminEnv = () =>
  createEnv({
    server: {
      /** Comma-separated emails of users allowed to start and cancel runs. */
      ADMIN_EMAILS: z
        .string()
        .default("")
        .transform((s) => s.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
  });
