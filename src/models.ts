import { useEffect, useState } from "react";
import { z } from "zod";
import { isChinese, vendorOf } from "../shared/types.ts";

export type ModelInfo = {
  id: string;
  name: string;
  vendor: string;
  /** Unix seconds. */
  created: number;
  chinese: boolean;
};

const ModelsResponse = z.object({
  data: z.array(z.object({ id: z.string(), name: z.string(), created: z.number() })),
});

/** OpenRouter names look like "Lab: Model". Splits them so each part can be styled. */
export const splitName = (name: string) => {
  const [lab, ...rest] = name.split(": ");
  return rest.length ? { lab: lab ?? "", model: rest.join(": ") } : { lab: "", model: name };
};

/** The live OpenRouter model list, newest first. The endpoint is public and allows CORS. */
export function useOpenRouterModels() {
  const [state, setState] = useState<{ models?: ModelInfo[]; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://openrouter.ai/api/v1/models", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`OpenRouter returned ${res.status}`))))
      .then((json) => {
        const models = ModelsResponse.parse(json)
          .data.filter((m) => !m.id.startsWith("~") && !m.id.endsWith(":batch"))
          .map((m) => ({ ...m, vendor: vendorOf(m.id), chinese: isChinese(m.id) }))
          .sort((a, b) => b.created - a.created);
        setState({ models });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ error: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, []);
  return state;
}
