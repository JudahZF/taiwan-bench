import { z } from "zod";
import { openRouterEnv } from "./env.ts";

const ChatResponse = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullish() }) })).optional(),
  error: z.object({ message: z.string() }).optional(),
});

export type ChatMessage = { role: "system" | "user"; content: string };

/** Per request. Keeps ask + judge well inside the 10 minute action limit. */
const REQUEST_TIMEOUT_MS = 180_000;

export type ReasoningEffort = "low" | "medium" | "high";

/**
 * One chat completion. Retries rate limits and server errors with backoff.
 * `effort` sets OpenRouter's reasoning effort. Leave it out to use the model's default.
 */
export async function chat(model: string, messages: ChatMessage[], effort?: ReasoningEffort): Promise<string> {
  const env = openRouterEnv();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "Taiwan Bench",
      },
      body: JSON.stringify({ model, messages, reasoning: effort && { effort } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
      continue;
    }
    const raw = await res.text();
    const body = ChatResponse.safeParse(safeJson(raw));
    if (!res.ok || !body.success || body.data.error || !body.data.choices?.length) {
      const detail = body.success ? body.data.error?.message : undefined;
      throw new Error(`HTTP ${res.status}: ${detail ?? raw.slice(0, 300)}`);
    }
    return body.data.choices[0]?.message.content ?? "";
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
