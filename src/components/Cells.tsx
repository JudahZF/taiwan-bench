import type { Verdict } from "../../shared/types.ts";
import { type SampleView, type Slots, VERDICT_META } from "../verdicts.ts";

/** One tinted cell per answer, ten to a row. Red cells are the lies. */
export function Cells({ slots, onPick }: { slots: Slots; onPick: (index: number) => void }) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {slots.map((sample, i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          aria-label={`Answer ${i + 1}: ${sample ? VERDICT_META[sample.verdict].label : "pending"}`}
          className={`group relative grid h-[18px] place-items-center rounded-[4px] text-[10px] leading-none font-semibold text-ink/70 outline-none transition hover:-translate-y-px hover:ring-1 hover:ring-ink/30 focus-visible:ring-2 focus-visible:ring-accurate ${
            sample ? `${VERDICT_META[sample.verdict].cell} animate-pop` : "border border-dashed border-line-strong"
          }`}
        >
          {sample && VERDICT_META[sample.verdict].glyph}
          <Tip index={i} sample={sample} alignRight={i % 10 >= 5} />
        </button>
      ))}
    </div>
  );
}

function Tip({ index, sample, alignRight }: { index: number; sample: SampleView | undefined; alignRight: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute bottom-full z-20 mb-2 hidden w-64 rounded-lg border border-line bg-surface p-3 text-left text-xs font-normal text-ink shadow-lg group-hover:block group-focus-visible:block ${alignRight ? "right-0" : "left-0"}`}
    >
      <span className="flex items-center gap-2 text-soft">
        Answer {index + 1}
        {sample ? <VerdictBadge verdict={sample.verdict} /> : <span>pending</span>}
      </span>
      {sample && <span className="mt-1 line-clamp-3 block leading-snug">{sample.reason}</span>}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
      <span className={`size-2.5 rounded-full ${VERDICT_META[verdict].bg}`} />
      {VERDICT_META[verdict].label}
    </span>
  );
}
