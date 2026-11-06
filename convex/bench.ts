import { vOnCompleteArgs, Workpool } from "@convex-dev/workpool";
import { type Infer, v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { judge } from "./judge.ts";
import { chat } from "./openrouter.ts";
import { vSlot, vVerdict } from "./schema.ts";

/** The Convex free plan allows 20 concurrent functions per deployment. */
export const pool = new Workpool(components.benchPool, { maxParallelism: 10 });

/** What one slot produced. Null when the run was cancelled before the slot started. */
const vOutcome = v.union(
  v.null(),
  v.object({
    slot: vSlot,
    verdict: vVerdict,
    reason: v.string(),
    answer: v.optional(v.object({ text: v.string(), latencyMs: v.number() })),
  }),
);
type Outcome = Infer<typeof vOutcome>;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500);

export const runInfo = internalQuery({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    return run && { status: run.status, questions: run.questions, judgeModel: run.judgeModel };
  },
});

/** Asks one model one question once, then grades the answer. Never throws for API errors. */
export const runSample = internalAction({
  args: vSlot.fields,
  returns: vOutcome,
  handler: async (ctx, slot): Promise<Outcome> => {
    const run = await ctx.runQuery(internal.bench.runInfo, { runId: slot.runId });
    if (run?.status !== "running") return null;
    const question = run.questions[slot.lang];

    const startedAt = Date.now();
    let text: string;
    try {
      text = await chat(slot.modelId, [{ role: "user", content: question }]);
    } catch (error) {
      return { slot, verdict: "error", reason: `Model failed: ${errorMessage(error)}` };
    }
    const answer = { text, latencyMs: Date.now() - startedAt };

    try {
      return { slot, answer, ...(await judge(run.judgeModel, question, text)) };
    } catch (error) {
      return { slot, answer, verdict: "error", reason: `Judge failed: ${errorMessage(error)}` };
    }
  },
});

/** Workpool onComplete hook. The only writer of samples and run progress. */
export const saveResult = internalMutation({
  args: vOnCompleteArgs(v.id("runs"), vOutcome),
  handler: async (ctx, { context: runId, result }) => {
    if (result.kind === "canceled") return;
    if (result.kind === "success" && !result.returnValue) return;

    const run = await ctx.db.get(runId);
    if (!run) return;

    // A crashed action has no slot to record, but it still counts as finished.
    const outcome = result.kind === "success" ? result.returnValue : null;
    if (outcome) {
      const { slot, verdict, reason, answer } = outcome;
      const existing = await ctx.db
        .query("samples")
        .withIndex("by_slot", (q) =>
          q.eq("runId", slot.runId).eq("modelId", slot.modelId).eq("lang", slot.lang).eq("index", slot.index),
        )
        .unique();
      if (existing) return;
      const sampleId = await ctx.db.insert("samples", { ...slot, verdict, reason });
      if (answer) await ctx.db.insert("answers", { sampleId, ...answer });
    }

    const finished = run.finished + 1;
    const done = finished >= run.total && run.status === "running";
    await ctx.db.patch(run._id, done ? { finished, status: "done", finishedAt: Date.now() } : { finished });
  },
});
