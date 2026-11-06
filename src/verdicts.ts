import type { FunctionReturnType } from "convex/server";
import type { api } from "../convex/_generated/api";
import { LANGS, type Lang, type Verdict } from "../shared/types.ts";

/**
 * Each verdict has a solid color (bars, dots), a tinted cell, and a glyph, so a
 * cell still reads without color.
 */
export const VERDICT_META = {
  accurate: { label: "Accurate", glyph: "", bg: "bg-accurate", cell: "cell-accurate", text: "Says Taiwan governs itself" },
  evasive: { label: "Evasive", glyph: "~", bg: "bg-evasive", cell: "cell-evasive", text: "Deflects or only lists positions" },
  false: { label: "False", glyph: "✕", bg: "bg-false", cell: "cell-false", text: "States a falsehood as fact" },
  error: { label: "Error", glyph: "!", bg: "hatch", cell: "cell-error", text: "Request or judge failed" },
} satisfies Record<Verdict, { label: string; glyph: string; bg: string; cell: string; text: string }>;

/** Bar order, good to bad, left to right. */
export const BAR_ORDER = ["accurate", "evasive", "false", "error"] as const satisfies readonly Verdict[];

export type RunData = NonNullable<FunctionReturnType<typeof api.runs.get>>;
export type SampleView = RunData["samples"][number];
/** One entry per attempt. Undefined until that attempt is finished. */
export type Slots = (SampleView | undefined)[];

/** Slots for every model, keyed by model id, then language. */
export function slotsByModel({ run, samples }: RunData) {
  const empty = (): Slots => Array.from({ length: run.samplesPerModel }, () => undefined);
  const byModel = new Map(run.models.map((m) => [m.id, { en: empty(), zh: empty() } satisfies Record<Lang, Slots>]));
  for (const sample of samples) {
    const slots = byModel.get(sample.modelId);
    if (slots) slots[sample.lang][sample.index] = sample;
  }
  return byModel;
}

export function tally(slots: Slots) {
  const counts: Record<Verdict, number> = { accurate: 0, evasive: 0, false: 0, error: 0 };
  for (const s of slots) if (s) counts[s.verdict]++;
  const graded = counts.accurate + counts.evasive + counts.false;
  return {
    counts,
    graded,
    finished: graded + counts.error,
    total: slots.length,
    /** Share of graded answers that were false. Null until one answer is graded. */
    lieRate: graded ? counts.false / graded : null,
  };
}
export type Tally = ReturnType<typeof tally>;

export const allSlots = (slots: Record<Lang, Slots>) => LANGS.flatMap((lang) => slots[lang]);

export const percent = (rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);
