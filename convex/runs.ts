import { ConvexError, v } from "convex/values";
import { LANGS, MAX_MODELS, MAX_SAMPLES } from "../shared/types.ts";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin } from "./admin.ts";
import { pool } from "./bench.ts";

export const me = query({
  args: {},
  handler: async (ctx) => ({ isAdmin: await isAdmin(ctx) }),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("runs").order("desc").take(100);
    return runs.map((run) => ({
      _id: run._id,
      _creationTime: run._creationTime,
      status: run.status,
      question: run.questions.en,
      modelCount: run.models.length,
      samplesPerModel: run.samplesPerModel,
      family: run.family,
    }));
  },
});

/** A run and its graded samples, without answer text. Returns null for unknown ids. */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const runId = ctx.db.normalizeId("runs", id);
    const run = runId && (await ctx.db.get(runId));
    if (!run) return null;
    const samples = await ctx.db
      .query("samples")
      .withIndex("by_run", (q) => q.eq("runId", run._id))
      .collect();
    return {
      run,
      samples: samples.map(({ _id, modelId, lang, index, verdict, reason }) => ({ _id, modelId, lang, index, verdict, reason })),
    };
  },
});

export const answer = query({
  args: { sampleId: v.id("samples") },
  handler: (ctx, { sampleId }) =>
    ctx.db
      .query("answers")
      .withIndex("by_sample", (q) => q.eq("sampleId", sampleId))
      .unique(),
});

const vModel = v.object({ id: v.string(), name: v.string() });

export const start = mutation({
  args: {
    questions: v.object({ en: v.string(), zh: v.string() }),
    models: v.array(vModel),
    samplesPerModel: v.number(),
    judgeModel: v.string(),
  },
  returns: v.id("runs"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await createRun(ctx, args);
  },
});

/** Validates a new run, saves it, and queues every slot. The caller checks admin rights. */
export async function createRun(
  ctx: MutationCtx,
  args: {
    questions: { en: string; zh: string };
    models: { id: string; name: string }[];
    samplesPerModel: number;
    judgeModel: string;
    family?: string;
  },
) {
  const questions = { en: args.questions.en.trim(), zh: args.questions.zh.trim() };
  const models = [...new Map(args.models.map((m) => [m.id, m])).values()];
  const judgeModel = args.judgeModel.trim();
  const { samplesPerModel, family } = args;

  if (!questions.en || !questions.zh) throw new ConvexError("Both questions are required.");
  if (!judgeModel) throw new ConvexError("A judge model is required.");
  if (models.length < 1 || models.length > MAX_MODELS) throw new ConvexError(`Pick 1 to ${MAX_MODELS} models.`);
  if (!Number.isInteger(samplesPerModel) || samplesPerModel < 1 || samplesPerModel > MAX_SAMPLES) {
    throw new ConvexError(`Asks per model must be 1 to ${MAX_SAMPLES}.`);
  }

  const runId = await ctx.db.insert("runs", {
    status: "running",
    questions,
    judgeModel,
    samplesPerModel,
    models,
    total: models.length * LANGS.length * samplesPerModel,
    finished: 0,
    family,
  });
  await pool.enqueueActionBatch(ctx, internal.bench.runSample, slotsOf(runId, models, samplesPerModel), {
    onComplete: internal.bench.saveResult,
    context: runId,
  });
  return runId;
}

export const cancel = mutation({
  args: { id: v.id("runs") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const run = await ctx.db.get(id);
    if (run?.status === "running") await ctx.db.patch(id, { status: "cancelled", finishedAt: Date.now() });
  },
});

/**
 * Ask again every slot of a finished or cancelled run that errored or never got a result.
 * Upstream rate limits and flaky providers make some errors normal in a large run.
 */
export const retry = mutation({
  args: { id: v.id("runs") },
  returns: v.number(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const run = await ctx.db.get(id);
    if (!run) throw new ConvexError("Run not found.");
    if (run.status === "running") throw new ConvexError("Wait for the run to finish, or cancel it first.");

    const kept = new Set<string>();
    for (const sample of await ctx.db.query("samples").withIndex("by_run", (q) => q.eq("runId", id)).collect()) {
      if (sample.verdict !== "error") {
        kept.add(`${sample.modelId}|${sample.lang}|${sample.index}`);
        continue;
      }
      for (const answer of await ctx.db.query("answers").withIndex("by_sample", (q) => q.eq("sampleId", sample._id)).collect()) {
        await ctx.db.delete(answer._id);
      }
      await ctx.db.delete(sample._id);
    }

    const slots = slotsOf(id, run.models, run.samplesPerModel).filter((s) => !kept.has(`${s.modelId}|${s.lang}|${s.index}`));
    if (!slots.length) return 0;

    await ctx.db.patch(id, { status: "running", finished: kept.size, finishedAt: undefined });
    await pool.enqueueActionBatch(ctx, internal.bench.runSample, slots, {
      onComplete: internal.bench.saveResult,
      context: id,
    });
    return slots.length;
  },
});

/** Attempt 1 for every model and language first, then attempt 2, so all models progress together. */
function slotsOf(runId: Id<"runs">, models: readonly { id: string }[], samplesPerModel: number) {
  return Array.from({ length: samplesPerModel }, (_, index) =>
    LANGS.flatMap((lang) => models.map((m) => ({ runId, modelId: m.id, lang, index }))),
  ).flat();
}
