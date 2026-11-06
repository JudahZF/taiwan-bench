import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { LANGS, VERDICTS } from "../shared/types.ts";

export const vLang = v.union(...LANGS.map((l) => v.literal(l)));
export const vVerdict = v.union(...VERDICTS.map((x) => v.literal(x)));

/** One answer slot: model × language × attempt. */
export const vSlot = v.object({
  runId: v.id("runs"),
  modelId: v.string(),
  lang: vLang,
  index: v.number(),
});

export default defineSchema({
  runs: defineTable({
    status: v.union(v.literal("running"), v.literal("done"), v.literal("cancelled")),
    questions: v.object({ en: v.string(), zh: v.string() }),
    judgeModel: v.string(),
    /** Asks per model per language. */
    samplesPerModel: v.number(),
    models: v.array(v.object({ id: v.string(), name: v.string() })),
    total: v.number(),
    finished: v.number(),
    finishedAt: v.optional(v.number()),
  }),
  // A sample exists only once its slot is finished. Answer text lives in
  // `answers`, so the live leaderboard query stays small.
  samples: defineTable({
    ...vSlot.fields,
    verdict: vVerdict,
    reason: v.string(),
  })
    .index("by_run", ["runId"])
    .index("by_slot", ["runId", "modelId", "lang", "index"]),
  answers: defineTable({
    sampleId: v.id("samples"),
    text: v.string(),
    latencyMs: v.number(),
  }).index("by_sample", ["sampleId"]),
});
