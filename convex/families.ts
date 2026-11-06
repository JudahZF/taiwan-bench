import { ConvexError, v } from "convex/values";
import { FAMILIES, familyByKey } from "../shared/families.ts";
import { DEFAULT_JUDGE, DEFAULT_QUESTIONS, DEFAULT_SAMPLES, type Lang, type Verdict } from "../shared/types.ts";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { createRun } from "./runs.ts";

type Counts = Record<Verdict, number>;
const emptyCounts = (): Counts => ({ accurate: 0, evasive: 0, false: 0, error: 0 });

/**
 * For each model, the newest run that can be compared across releases: same
 * questions, judge and sample count as the defaults, and not cancelled.
 */
async function comparableRuns(ctx: QueryCtx) {
  const byModel = new Map<string, Doc<"runs">>();
  for (const run of await ctx.db.query("runs").order("desc").take(200)) {
    const comparable =
      run.status !== "cancelled" &&
      run.judgeModel === DEFAULT_JUDGE &&
      run.samplesPerModel === DEFAULT_SAMPLES &&
      run.questions.en === DEFAULT_QUESTIONS.en &&
      run.questions.zh === DEFAULT_QUESTIONS.zh;
    if (!comparable) continue;
    for (const m of run.models) if (!byModel.has(m.id)) byModel.set(m.id, run);
  }
  return byModel;
}

/** Verdict counts per language for every lineage model that has a comparable run. */
export const results = query({
  args: {},
  handler: async (ctx) => {
    const runs = await comparableRuns(ctx);
    const out: Record<string, { runId: Doc<"runs">["_id"]; running: boolean } & Record<Lang, Counts>> = {};
    for (const model of FAMILIES.flatMap((f) => f.models)) {
      const run = runs.get(model.id);
      if (!run) continue;
      const entry = { runId: run._id, running: run.status === "running", en: emptyCounts(), zh: emptyCounts() };
      const samples = ctx.db
        .query("samples")
        .withIndex("by_slot", (q) => q.eq("runId", run._id).eq("modelId", model.id));
      for await (const s of samples) entry[s.lang][s.verdict]++;
      out[model.id] = entry;
    }
    return out;
  },
});

/**
 * Admin: run every release of one family that has no comparable result yet,
 * with the default questions, judge and sample count.
 */
export const start = mutation({
  args: { family: v.string() },
  returns: v.object({ runId: v.id("runs"), models: v.number() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const family = familyByKey(args.family);
    if (!family) throw new ConvexError(`Unknown family. Use one of: ${FAMILIES.map((f) => f.key).join(", ")}.`);

    const done = await comparableRuns(ctx);
    const models = family.models.filter((m) => !done.has(m.id)).map(({ id, name }) => ({ id, name }));
    if (!models.length) throw new ConvexError(`Every ${family.name} release already has results.`);

    const runId = await createRun(ctx, {
      questions: DEFAULT_QUESTIONS,
      models,
      samplesPerModel: DEFAULT_SAMPLES,
      judgeModel: DEFAULT_JUDGE,
      family: family.key,
    });
    return { runId, models: models.length };
  },
});
