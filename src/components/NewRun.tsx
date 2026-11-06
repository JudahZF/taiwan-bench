import { Show, SignInButton } from "@clerk/react";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { type ReactNode, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
  DEFAULT_JUDGE,
  DEFAULT_QUESTIONS,
  DEFAULT_SAMPLES,
  LANG_LABEL,
  LANGS,
  type Lang,
  MAX_MODELS,
  MAX_SAMPLES,
} from "../../shared/types.ts";
import { env } from "../env.ts";
import { type ModelInfo, splitName, useOpenRouterModels } from "../models.ts";
import { navigate } from "../router.ts";
import { CONTAINER } from "./TopBar.tsx";

/**
 * Ids that look like small, specialised or experimental variants. Each marker
 * must start a dash-separated part, so "minimax" does not match "mini".
 */
const SIDE_VARIANT =
  /-(flash|mini|tiny|lite|air|omni|vision|coder|code|legal|exp|ultraspeed)\w*|-vl\b|-mt\d|\d+(\.\d+)?b\b/i;

/** Newest flagship-looking model from each Chinese lab. Models arrive newest first. */
function latestPerLab(models: readonly ModelInfo[]) {
  const picks = new Map<string, string>();
  for (const m of models) {
    if (m.chinese && !picks.has(m.vendor) && !SIDE_VARIANT.test(m.id)) picks.set(m.vendor, m.id);
  }
  return new Set(picks.values());
}

const PREVIEW_PER_LAB = 4;
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });

export function NewRun() {
  const me = useQuery(api.runs.me);
  if (me === undefined) return null;
  if (!me.isAdmin) return <AdminOnly />;
  return <NewRunForm />;
}

function AdminOnly() {
  return (
    <div className={`${CONTAINER} pt-10 pb-20`}>
      <h1 className="text-[44px] leading-tight font-bold sm:text-[56px]">Admins only</h1>
      <p className="mt-4 max-w-lg text-[17px] text-soft">Only admins can start benchmark runs, because each run spends OpenRouter credit.</p>
      {env.VITE_CLERK_PUBLISHABLE_KEY && (
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="mt-6 rounded-full bg-accurate px-5 py-2.5 font-semibold text-white">Admin sign in</button>
          </SignInButton>
        </Show>
      )}
    </div>
  );
}

function NewRunForm() {
  const { models, error: modelsError } = useOpenRouterModels();
  const startRun = useMutation(api.runs.start);

  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [samples, setSamples] = useState(DEFAULT_SAMPLES);
  const [judgeModel, setJudgeModel] = useState(DEFAULT_JUDGE);
  // Null until the user edits the selection, so the default can follow the model list.
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();

  const defaults = useMemo(() => latestPerLab(models ?? []), [models]);
  const selected = picked ?? defaults;
  const names = useMemo(() => new Map(models?.map((m) => [m.id, splitName(m.name).model])), [models]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (!next.delete(id)) next.add(id);
    setPicked(next);
  };

  const answers = selected.size * LANGS.length * samples;
  const problem =
    selected.size === 0 ? "Pick at least one model." :
    selected.size > MAX_MODELS ? `Pick at most ${MAX_MODELS} models.` :
    !(samples >= 1 && samples <= MAX_SAMPLES) ? `Asks must be 1 to ${MAX_SAMPLES}.` :
    LANGS.some((l) => !questions[l].trim()) ? "Both questions are required." :
    !judgeModel.trim() ? "A judge model is required." : undefined;

  const submit = async () => {
    setStarting(true);
    setError(undefined);
    try {
      const runId = await startRun({
        questions,
        samplesPerModel: samples,
        judgeModel,
        models: [...selected].map((id) => ({ id, name: names.get(id) ?? id })),
      });
      navigate(`#/run/${runId}`);
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : e instanceof Error ? e.message : String(e));
      setStarting(false);
    }
  };

  return (
    <div className={`${CONTAINER} grid gap-x-14 pt-6 pb-20 xl:grid-cols-[22rem_minmax(0,1fr)]`}>
      <form
        className="xl:sticky xl:top-8 xl:self-start"
        onSubmit={(e) => {
          e.preventDefault();
          if (!problem) void submit();
        }}
      >
        <h1 className="text-[44px] leading-tight font-bold">New run</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-soft">
          Each model gets each question as a fresh chat, with no system prompt. A judge model grades every answer
          against a fixed factual baseline.
        </p>

        {LANGS.map((lang: Lang) => (
          <Field key={lang} label={`Question · ${LANG_LABEL[lang]}`}>
            <textarea
              lang={lang === "zh" ? "zh-Hans" : "en"}
              value={questions[lang]}
              onChange={(e) => setQuestions({ ...questions, [lang]: e.target.value })}
              rows={2}
              className="w-full resize-y rounded-md border border-line-strong bg-surface px-3 py-2 text-lg leading-snug outline-none focus:border-accurate"
            />
          </Field>
        ))}

        <Field label="Asks per model, per language">
          <input
            type="number"
            min={1}
            max={MAX_SAMPLES}
            value={samples}
            onChange={(e) => setSamples(e.target.valueAsNumber || 0)}
            className="w-24 rounded-md border border-line-strong bg-surface px-3 py-2 outline-none focus:border-accurate"
          />
        </Field>
        <Field label="Judge model">
          <input
            list="all-models"
            value={judgeModel}
            onChange={(e) => setJudgeModel(e.target.value)}
            className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accurate"
          />
          <datalist id="all-models">
            {models?.map((m) => <option key={m.id} value={m.id} />)}
          </datalist>
        </Field>

        <div className="mt-6 rounded-xl border border-line bg-wash p-4">
          <div className="text-sm text-soft tabular-nums">
            {selected.size} models × 2 languages × {samples} = <b className="font-semibold text-ink">{answers} answers</b>
            <br />+ {answers} judge calls
          </div>
          <button
            type="submit"
            disabled={!!problem || starting}
            className="mt-3 w-full rounded-full bg-accurate px-4 py-2.5 font-semibold text-white transition hover:-translate-y-px hover:shadow-lg active:translate-y-0 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
          >
            {starting ? "Starting…" : "Start run"}
          </button>
          {(error ?? problem) && <p className="mt-2 text-sm text-false">{error ?? problem}</p>}
        </div>
      </form>

      <ModelPicker
        models={models ?? []}
        loading={!models && !modelsError}
        error={modelsError}
        selected={selected}
        onToggle={toggle}
        onSet={setPicked}
        defaults={defaults}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-5 block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wider text-soft uppercase">{label}</span>
      {children}
    </label>
  );
}

type PickerProps = {
  models: readonly ModelInfo[];
  loading: boolean;
  error: string | undefined;
  selected: ReadonlySet<string>;
  defaults: Set<string>;
  onToggle: (id: string) => void;
  onSet: (ids: Set<string>) => void;
};

function ModelPicker({ models, loading, error, selected, defaults, onToggle, onSet }: PickerProps) {
  const [search, setSearch] = useState("");
  const [showControls, setShowControls] = useState(false);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const byVendor = new Map<string, ModelInfo[]>();
    for (const m of models) {
      if (!showControls && !m.chinese && !selected.has(m.id)) continue;
      if (needle && !`${m.id} ${m.name}`.toLowerCase().includes(needle)) continue;
      byVendor.set(m.vendor, [...(byVendor.get(m.vendor) ?? []), m]);
    }
    return [...byVendor].sort(([a, am], [b, bm]) => Number(bm[0]?.chinese) - Number(am[0]?.chinese) || a.localeCompare(b));
  }, [models, search, showControls, selected]);

  return (
    <section className="mt-10 min-w-0 xl:mt-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <h2 className="mr-auto text-[30px] font-bold">Models</h2>
        <input
          type="search"
          placeholder="Search models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm outline-none focus:border-accurate sm:w-56"
        />
        <ChipButton onClick={() => onSet(new Set(defaults))}>Latest per lab</ChipButton>
        <ChipButton onClick={() => onSet(new Set())}>Clear</ChipButton>
        <ChipButton onClick={() => setShowControls(!showControls)} active={showControls}>
          Show controls
        </ChipButton>
      </div>
      {showControls && (
        <p className="mt-3 text-xs text-soft">
          Non-Chinese models run as controls. They show below the ranked list, so you can compare against a baseline.
        </p>
      )}

      {loading && <p className="animate-breathe mt-6 text-sm text-faint">Loading OpenRouter models…</p>}
      {error && <p className="mt-6 text-sm text-false">Could not load models: {error}</p>}

      <div className="mt-2 columns-1 gap-8 lg:columns-2 2xl:columns-3">
        {groups.map(([vendor, list]) => {
          const open = expanded.has(vendor) || search.trim() !== "";
          const shown = open ? list : list.slice(0, PREVIEW_PER_LAB);
          const count = list.filter((m) => selected.has(m.id)).length;
          return (
            <div key={vendor} className="mt-5 break-inside-avoid">
              <div className="flex items-baseline gap-2 border-b border-line pb-1">
                <span className="font-semibold">{splitName(list[0]!.name).lab || vendor}</span>
                {!list[0]!.chinese && <span className="text-[10px] font-semibold tracking-wider text-faint uppercase">control</span>}
                <span className="ml-auto text-[11px] text-faint">{count > 0 ? `${count} selected` : ""}</span>
              </div>
              <ul>
                {shown.map((m) => (
                  <ModelOption key={m.id} model={m} checked={selected.has(m.id)} onToggle={onToggle} />
                ))}
              </ul>
              {list.length > PREVIEW_PER_LAB && !search.trim() && (
                <button
                  onClick={() => {
                    const next = new Set(expanded);
                    if (!next.delete(vendor)) next.add(vendor);
                    setExpanded(next);
                  }}
                  className="mt-1 text-[11px] text-faint hover:text-ink"
                >
                  {open ? "Show fewer" : `Show ${list.length - PREVIEW_PER_LAB} more`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModelOption({ model, checked, onToggle }: { model: ModelInfo; checked: boolean; onToggle: (id: string) => void }) {
  return (
    <li>
      <label className="group -mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-wash">
        <input type="checkbox" checked={checked} onChange={() => onToggle(model.id)} className="peer sr-only" />
        <span className="grid size-4 shrink-0 place-items-center rounded-[4px] border border-line-strong text-[10px] text-white transition peer-checked:border-accurate peer-checked:bg-accurate peer-focus-visible:ring-2 peer-focus-visible:ring-ink/40">
          {checked && "✓"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{splitName(model.name).model}</span>
          <span className="block truncate text-[11px] text-faint">{model.id}</span>
        </span>
        <span className="shrink-0 text-[11px] text-faint">{monthFormat.format(model.created * 1000)}</span>
      </label>
    </li>
  );
}

function ChipButton({ onClick, active, children }: { onClick: () => void; active?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-soft transition hover:border-line-strong hover:text-ink aria-pressed:border-accurate aria-pressed:bg-accurate aria-pressed:text-white"
    >
      {children}
    </button>
  );
}
