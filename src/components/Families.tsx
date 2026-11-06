import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { type Family, FAMILIES, type FamilyModel } from "../../shared/families.ts";
import { DEFAULT_JUDGE, DEFAULT_QUESTIONS, DEFAULT_SAMPLES, LANGS, type Lang, type Verdict } from "../../shared/types.ts";
import { navigate } from "../router.ts";
import { BAR_ORDER, percent, VERDICT_META } from "../verdicts.ts";
import { CONTAINER } from "./TopBar.tsx";

type Results = FunctionReturnType<typeof api.families.results>;
type Counts = Record<Verdict, number>;
type Point = FamilyModel & { at: number; result: Results[string] | undefined; rate: Record<Lang, number | null> };

const lieRate = (c: Counts) => {
  const graded = c.accurate + c.evasive + c.false;
  return graded ? c.false / graded : null;
};

const toPoints = (family: Family, results: Results): Point[] =>
  family.models.map((m) => {
    const result = results[m.id];
    return {
      ...m,
      at: Date.parse(m.released),
      result,
      rate: { en: result ? lieRate(result.en) : null, zh: result ? lieRate(result.zh) : null },
    };
  });

/** One time axis for every panel, so the families line up in time. */
const MONTH = 30 * 24 * 3600 * 1000;
const ALL_DATES = FAMILIES.flatMap((f) => f.models.map((m) => Date.parse(m.released)));
const DOMAIN = [Math.min(...ALL_DATES) - MONTH, Math.max(...ALL_DATES) + MONTH] as const;
const YEARS = Array.from(
  { length: new Date(DOMAIN[1]).getUTCFullYear() - new Date(DOMAIN[0]).getUTCFullYear() },
  (_, i) => Date.UTC(new Date(DOMAIN[0]).getUTCFullYear() + i + 1, 0, 1),
);
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric", timeZone: "UTC" });

export function Families({ selected }: { selected: string | undefined }) {
  const results = useQuery(api.families.results);
  if (results === undefined) return <p className={`${CONTAINER} animate-breathe py-16 text-soft`}>Loading…</p>;

  const active = FAMILIES.find((f) => f.key === selected) ?? FAMILIES.find((f) => f.models.some((m) => results[m.id])) ?? FAMILIES[0]!;

  return (
    <>
      <section className={`${CONTAINER} pt-6 pb-14`}>
        <h1 className="text-center text-[40px] leading-[1.05] font-bold tracking-[-0.01em] text-balance sm:text-[56px]">
          Are newer models more honest?
        </h1>

        <figure className="mx-auto mt-10 max-w-5xl rounded-xl border border-line bg-surface p-5 sm:p-7">
          <div className="text-[11px] font-semibold tracking-wider text-soft uppercase">Lie rate by release</div>
          <figcaption className="mt-1 text-2xl leading-tight font-bold sm:text-[28px]">One lab per panel, oldest to newest</figcaption>
          <LineLegend />
          <div className="mt-4 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FAMILIES.map((f) => (
              <Panel key={f.key} family={f} points={toPoints(f, results)} active={f.key === active.key} />
            ))}
          </div>
          <p className="mt-6 border-t border-line pt-3 text-xs text-soft">
            Lie rate = false answers ÷ graded answers. Every release gets the same two questions, {DEFAULT_SAMPLES} times each,
            graded by {DEFAULT_JUDGE}. Dates are when OpenRouter listed the model. Some hosts filter answers; an empty answer counts as evasive.
          </p>
        </figure>
      </section>

      <VerdictMix family={active} points={toPoints(active, results)} />
    </>
  );
}

function LineLegend() {
  return (
    <div className="mt-4 flex gap-5 text-xs font-medium text-soft">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border-2 border-accurate bg-surface" /> English
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-false" /> 中文
      </span>
    </div>
  );
}

const W = 360;
const H = 200;
const PAD = { left: 34, right: 14, top: 16, bottom: 24 };
const sx = (t: number) => PAD.left + ((t - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * (W - PAD.left - PAD.right);
const sy = (rate: number) => PAD.top + (1 - rate) * (H - PAD.top - PAD.bottom);

/** Small multiple: lie rate in each language across one lab's releases. */
function Panel({ family, points, active }: { family: Family; points: Point[]; active: boolean }) {
  const [hover, setHover] = useState<number>();
  const measured = points.filter((p) => p.result);
  const latest = measured.at(-1);
  const running = measured.some((p) => p.result?.running);
  const hovered = hover === undefined ? undefined : points[hover];

  const line = (lang: Lang) =>
    points
      .filter((p) => p.rate[lang] !== null)
      .map((p, i) => `${i ? "L" : "M"}${sx(p.at).toFixed(1)},${sy(p.rate[lang]!).toFixed(1)}`)
      .join("");

  return (
    <div>
      <button
        onClick={() => navigate(`#/families/${family.key}`)}
        className={`block text-left text-[17px] font-semibold hover:text-accurate ${active ? "text-accurate" : ""}`}
      >
        {family.name}
      </button>
      <div className="mt-0.5 text-xs text-soft">
        {running && <span className="animate-breathe mr-1.5 font-medium text-ink">Running ·</span>}
        {latest
          ? `${latest.name}: EN ${percent(latest.rate.en)} · 中文 ${percent(latest.rate.zh)}`
          : `Not run yet · ${family.models.length} releases`}
      </div>

      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`${family.name} lie rate by release`}>
          {[0, 0.5, 1].map((r) => (
            <g key={r}>
              <line x1={PAD.left} x2={W - PAD.right} y1={sy(r)} y2={sy(r)} className="stroke-line" />
              <text x={PAD.left - 6} y={sy(r) + 3} textAnchor="end" className="fill-faint text-[10px]">
                {r * 100}%
              </text>
            </g>
          ))}
          {YEARS.map((t) => (
            <text key={t} x={sx(t)} y={H - 6} textAnchor="middle" className="fill-faint text-[10px]">
              {new Date(t).getUTCFullYear()}
            </text>
          ))}

          {!measured.length && (
            <text x={(PAD.left + W - PAD.right) / 2} y={sy(0.5) + 4} textAnchor="middle" className="fill-faint text-[12px]">
              No results yet
            </text>
          )}
          {/* Planned releases without results sit on the baseline as small ticks. */}
          {points.map((p) => !p.result && <line key={p.id} x1={sx(p.at)} x2={sx(p.at)} y1={sy(0) - 3} y2={sy(0) + 3} className="stroke-line-strong" />)}

          <path d={line("en")} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-accurate" />
          <path d={line("zh")} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-false" />
          {points.map((p, i) => (
            <g key={p.id} className={hover !== undefined && hover !== i ? "opacity-60" : ""}>
              {p.rate.en !== null && <circle cx={sx(p.at)} cy={sy(p.rate.en)} r={5.5} strokeWidth={2.5} className="fill-surface stroke-accurate" />}
              {p.rate.zh !== null && <circle cx={sx(p.at)} cy={sy(p.rate.zh)} r={5.5} strokeWidth={1.5} className="fill-false stroke-surface" />}
            </g>
          ))}
          {latest && <EndLabels point={latest} />}

          {points.map((p, i) => (
            <rect
              key={p.id}
              x={sx(p.at) - 9}
              y={PAD.top - 6}
              width={18}
              height={H - PAD.top - PAD.bottom + 12}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(undefined)}
            />
          ))}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 w-48 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface p-2.5 text-xs shadow-lg"
            style={{ left: `${(sx(hovered.at) / W) * 100}%`, top: `${(PAD.top / H) * 100}%` }}
          >
            <div className="font-semibold text-ink">{hovered.name}</div>
            <div className="text-soft">{monthFormat.format(hovered.at)}</div>
            {hovered.result ? (
              <div className="mt-1 tabular-nums">
                English {percent(hovered.rate.en)} · 中文 {percent(hovered.rate.zh)}
              </div>
            ) : (
              <div className="mt-1 text-soft">Not run yet</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Values beside the newest point. The English label moves below when the two would collide. */
function EndLabels({ point }: { point: Point }) {
  const { en, zh } = point.rate;
  const x = sx(point.at) + 7;
  const apart = en === null || zh === null || Math.abs(en - zh) > 0.08;
  return (
    <g className="text-[11px] font-semibold">
      {zh !== null && (
        <text x={x} y={sy(zh) - 7} textAnchor="end" className="fill-ink">
          {percent(zh)}
        </text>
      )}
      {en !== null && apart && (
        <text x={x} y={sy(en) + 16} textAnchor="end" className="fill-accurate">
          {percent(en)}
        </text>
      )}
    </g>
  );
}

/** Full verdict mix per release, so a move from evasive to false is visible. */
function VerdictMix({ family, points }: { family: Family; points: Point[] }) {
  return (
    <section className={`${CONTAINER} border-t border-line pt-12 pb-16`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[32px] leading-tight font-bold">Verdict mix by release</h2>
          <p className="mt-1 text-[15px] text-soft">A lie rate hides refusals. This shows every verdict, oldest release first.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl border border-line p-1 text-sm font-medium">
          {FAMILIES.map((f) => (
            <a
              key={f.key}
              href={`#/families/${f.key}`}
              className={`rounded-full px-3.5 py-1.5 ${f.key === family.key ? "bg-accurate text-white" : "text-soft hover:text-ink"}`}
            >
              {f.name}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-8 hidden grid-cols-[minmax(0,13rem)_1fr_1fr] gap-x-8 text-sm font-semibold md:grid">
        <span className="text-soft">Release</span>
        {LANGS.map((lang) => (
          <span key={lang}>
            {lang === "en" ? "English" : "中文"}{" "}
            <span className="font-normal text-soft">{lang === "en" ? `“${DEFAULT_QUESTIONS.en}”` : `「${DEFAULT_QUESTIONS.zh}」`}</span>
          </span>
        ))}
      </div>
      <ol className="mt-3">
        {points.map((p) => (
          <li key={p.id} className="grid gap-x-8 gap-y-2 border-t border-line py-4 md:grid-cols-[minmax(0,13rem)_1fr_1fr] md:items-center">
            <div>
              <div className="text-[16px] font-semibold">{p.name}</div>
              <div className="text-xs text-soft">{monthFormat.format(p.at)}</div>
            </div>
            {p.result ? (
              LANGS.map((lang) => <MixBar key={lang} lang={lang} counts={p.result![lang]} />)
            ) : (
              <div className="text-sm text-faint md:col-span-2">Not run yet</div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function MixBar({ lang, counts }: { lang: Lang; counts: Counts }) {
  const rate = lieRate(counts);
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-xs font-semibold text-soft md:hidden">{lang === "en" ? "EN" : "中文"}</span>
      <div className="flex h-5 flex-1 gap-0.5 overflow-hidden rounded-[4px] bg-wash">
        {BAR_ORDER.map(
          (v) =>
            counts[v] > 0 && (
              <span
                key={v}
                title={`${VERDICT_META[v].label}: ${counts[v]} of ${DEFAULT_SAMPLES}`}
                className={`h-full transition-[width] duration-700 ${VERDICT_META[v].bg}`}
                style={{ width: `${(counts[v] / DEFAULT_SAMPLES) * 100}%` }}
              />
            ),
        )}
      </div>
      <span className="w-12 text-right text-[15px] font-bold tabular-nums">{percent(rate)}</span>
    </div>
  );
}
