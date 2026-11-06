import type { ReactNode } from "react";
import { percent, type Tally } from "../verdicts.ts";

export type GapRow = { id: string; name: string; en: Tally; zh: Tally };

const TICKS = [0, 0.25, 0.5, 0.75, 1];

/** Dumbbell chart: each model's lie rate in English (hollow) and Chinese (solid). */
export function GapChart({ rows, title, footnote }: { rows: GapRow[]; title: string; footnote: string }) {
  return (
    <figure className="rounded-xl border border-line bg-surface p-5 sm:p-7">
      <div className="text-[11px] font-semibold tracking-wider text-soft uppercase">English vs. 中文</div>
      <figcaption className="mt-1 text-2xl leading-tight font-bold text-balance sm:text-[28px]">{title}</figcaption>
      <div className="mt-4 flex gap-5 text-xs font-medium text-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-accurate bg-surface" /> English
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-false" /> 中文
        </span>
      </div>

      <div className="mt-2">
        {rows.map((row, i) => (
          <GapLine key={row.id} row={row} order={i} />
        ))}
        <div className="grid grid-cols-[minmax(0,8.5rem)_1fr] gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
          <span />
          <div className="relative h-5 text-[11px] text-faint">
            {TICKS.map((t) => (
              <span key={t} className="absolute top-1 -translate-x-1/2" style={{ left: `${t * 100}%` }}>
                {t * 100}%
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 border-t border-line pt-3 text-xs text-soft">{footnote}</p>
    </figure>
  );
}

function GapLine({ row, order }: { row: GapRow; order: number }) {
  const en = row.en.lieRate;
  const zh = row.zh.lieRate;
  const low = Math.min(en ?? zh ?? 0, zh ?? en ?? 0);
  const high = Math.max(en ?? zh ?? 0, zh ?? en ?? 0);
  return (
    <div
      className="group grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-4 rounded-md sm:grid-cols-[minmax(0,10rem)_1fr]"
      title={`${row.name}: English ${percent(en)}, 中文 ${percent(zh)}`}
    >
      <span className="truncate text-[15px] font-semibold">{row.name}</span>
      <div className="relative h-14">
        {TICKS.map((t) => (
          <span key={t} className="absolute inset-y-0 w-px bg-line" style={{ left: `${t * 100}%` }} />
        ))}
        {en !== null && zh !== null && (
          <span
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-line-strong transition-all duration-700"
            style={{ left: `${low * 100}%`, width: `${(high - low) * 100}%` }}
          />
        )}
        {en !== null && (
          <Dot at={en} order={order} className="border-2 border-accurate bg-surface">
            <span className="absolute top-full mt-0.5 text-[11px] font-semibold text-accurate">{percent(en)}</span>
          </Dot>
        )}
        {zh !== null && (
          <Dot at={zh} order={order} className="bg-false">
            <span className="absolute bottom-full mb-0.5 text-[13px] font-bold text-ink">{percent(zh)}</span>
          </Dot>
        )}
      </div>
    </div>
  );
}

function Dot({ at, order, className, children }: { at: number; order: number; className: string; children: ReactNode }) {
  return (
    <span
      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left] duration-700"
      style={{ left: `${at * 100}%` }}
    >
      <span
        className={`animate-pop size-3 rounded-full transition-transform group-hover:scale-125 ${className}`}
        style={{ animationDelay: `${order * 50}ms` }}
      />
      {children}
    </span>
  );
}
