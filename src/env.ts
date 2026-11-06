import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_CONVEX_URL: z.url(),
    /** Optional. Without it the site is read-only: no sign-in and no new runs. */
    VITE_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
