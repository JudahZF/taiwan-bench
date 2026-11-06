/**
 * Flagship lineage of each lab, oldest first. Side variants (flash, coder, vision)
 * are left out, so each line shows one product getting newer.
 * `released` is the date the model appeared on OpenRouter.
 */
export type FamilyModel = { id: string; name: string; released: string };
export type Family = { key: string; name: string; models: readonly FamilyModel[] };

export const FAMILIES: readonly Family[] = [
  {
    key: "qwen",
    name: "Qwen",
    models: [
      { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen2.5 72B", released: "2024-09-19" },
      { id: "qwen/qwen3-235b-a22b-2507", name: "Qwen3 235B 2507", released: "2025-07-21" },
      { id: "qwen/qwen3.5-397b-a17b", name: "Qwen3.5 397B", released: "2026-02-16" },
      { id: "qwen/qwen3.6-plus", name: "Qwen3.6 Plus", released: "2026-04-02" },
      { id: "qwen/qwen3.7-max", name: "Qwen3.7 Max", released: "2026-05-21" },
      { id: "qwen/qwen3.8-max-prime", name: "Qwen3.8 Max Prime", released: "2026-09-23" },
    ],
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3", released: "2024-12-26" },
      { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3 0324", released: "2025-03-24" },
      { id: "deepseek/deepseek-r1-0528", name: "DeepSeek R1 0528", released: "2025-05-28" },
      { id: "deepseek/deepseek-chat-v3.1", name: "DeepSeek V3.1", released: "2025-08-21" },
      { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", released: "2025-12-01" },
      { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro", released: "2026-04-24" },
      { id: "deepseek/deepseek-v4-pro-0813", name: "DeepSeek V4 Pro 0813", released: "2026-08-12" },
    ],
  },
  {
    key: "kimi",
    name: "Kimi",
    models: [
      { id: "moonshotai/kimi-k2", name: "Kimi K2", released: "2025-07-11" },
      { id: "moonshotai/kimi-k2-0905", name: "Kimi K2 0905", released: "2025-09-04" },
      { id: "moonshotai/kimi-k2-thinking", name: "Kimi K2 Thinking", released: "2025-11-06" },
      { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5", released: "2026-01-27" },
      { id: "moonshotai/kimi-k2.6", name: "Kimi K2.6", released: "2026-04-20" },
      { id: "moonshotai/kimi-k3", name: "Kimi K3", released: "2026-07-16" },
      { id: "moonshotai/kimi-k3.1-pro", name: "Kimi K3.1 Pro", released: "2026-10-23" },
    ],
  },
  {
    key: "glm",
    name: "GLM",
    models: [
      { id: "z-ai/glm-4.5", name: "GLM 4.5", released: "2025-07-25" },
      { id: "z-ai/glm-4.6", name: "GLM 4.6", released: "2025-09-30" },
      { id: "z-ai/glm-4.7", name: "GLM 4.7", released: "2025-12-22" },
      { id: "z-ai/glm-5", name: "GLM 5", released: "2026-02-11" },
      { id: "z-ai/glm-5.1", name: "GLM 5.1", released: "2026-04-07" },
      { id: "z-ai/glm-5.2", name: "GLM 5.2", released: "2026-06-16" },
      { id: "z-ai/glm-5.3", name: "GLM 5.3", released: "2026-08-18" },
      { id: "z-ai/glm-5.3-prime", name: "GLM 5.3 Prime", released: "2026-09-23" },
    ],
  },
  {
    key: "minimax",
    name: "MiniMax",
    models: [
      { id: "minimax/minimax-m1", name: "MiniMax M1", released: "2025-06-17" },
      { id: "minimax/minimax-m2.5", name: "MiniMax M2.5", released: "2026-02-12" },
      { id: "minimax/minimax-m2.7", name: "MiniMax M2.7", released: "2026-03-18" },
      { id: "minimax/minimax-m3", name: "MiniMax M3", released: "2026-05-31" },
    ],
  },
];

export const familyByKey = (key: string): Family | undefined => FAMILIES.find((f) => f.key === key);
