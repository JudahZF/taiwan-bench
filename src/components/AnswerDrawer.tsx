import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { LANG_LABEL, LANGS, type Lang } from "../../shared/types.ts";
import { type Slots, VERDICT_META } from "../verdicts.ts";
import { VerdictBadge } from "./Cells.tsx";

export type Pick = { lang: Lang; index: number };

type Props = {
  model: Doc<"runs">["models"][number];
  slots: Record<Lang, Slots>;
  questions: Doc<"runs">["questions"];
  pick: Pick;
  onPick: (pick: Pick) => void;
  onClose: () => void;
};

const zhAttr = (lang: Lang) => (lang === "zh" ? "zh-Hans" : "en");

export function AnswerDrawer({ model, slots, questions, pick, onPick, onClose }: Props) {
  const { lang, index } = pick;
  const tape = slots[lang];
  const count = tape.length;
  const sample = tape[index];
  const answer = useQuery(api.runs.answer, sample ? { sampleId: sample._id } : "skip");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPick({ lang, index: (index - 1 + count) % count });
      if (e.key === "ArrowRight") onPick({ lang, index: (index + 1) % count });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lang, index, count, onPick, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="animate-fade absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <section
        role="dialog"
        aria-label={`Answer ${index + 1} from ${model.name}`}
        className="animate-slide relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{model.name}</div>
            <div className="truncate text-xs text-faint">{model.id}</div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1 text-sm">
            <NavButton label="Previous answer" onClick={() => onPick({ lang, index: (index - 1 + count) % count })}>←</NavButton>
            <span className="w-16 text-center text-soft tabular-nums">
              {index + 1} / {count}
            </span>
            <NavButton label="Next answer" onClick={() => onPick({ lang, index: (index + 1) % count })}>→</NavButton>
            <NavButton label="Close" onClick={onClose}>✕</NavButton>
          </div>
        </header>

        <div className="flex items-center gap-4 border-b border-line px-5 py-3">
          <div role="tablist" className="flex shrink-0 rounded-md border border-line-strong p-0.5 text-xs">
            {LANGS.map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={l === lang}
                lang={zhAttr(l)}
                onClick={() => onPick({ lang: l, index })}
                className="rounded px-2.5 py-1 text-soft transition aria-selected:bg-accurate aria-selected:text-white"
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>
          {/* Mini tape for jumping between answers. */}
          <div className="flex flex-1 gap-[3px]">
            {tape.map((s, i) => (
              <button
                key={i}
                onClick={() => onPick({ lang, index: i })}
                aria-label={`Answer ${i + 1}`}
                className={`h-2 flex-1 rounded-full transition ${s ? VERDICT_META[s.verdict].bg : "bg-line"} ${i === index ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "opacity-60 hover:opacity-100"}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p lang={zhAttr(lang)} className="mb-4 text-lg font-medium text-soft">
            {lang === "zh" ? `「${questions.zh}」` : `“${questions.en}”`}
          </p>
          {sample ? (
            <div className="rounded-lg border border-line bg-wash p-4">
              <div className="flex items-center justify-between gap-3">
                <VerdictBadge verdict={sample.verdict} />
                <span className=" text-xs text-faint">{VERDICT_META[sample.verdict].text}</span>
              </div>
              <p className="mt-2 text-[16px] leading-snug">{sample.reason}</p>
            </div>
          ) : (
            <p className="animate-breathe text-sm text-faint">Waiting for this answer…</p>
          )}

          {answer && (
            <>
              <div className="mt-6 mb-2 flex items-baseline justify-between text-[11px] font-semibold tracking-wider text-soft uppercase">
                <span>Model answer</span>
                <span>
                  {answer.provider && `${answer.provider} · `}
                  {(answer.latencyMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div lang={zhAttr(lang)} className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                {answer.text || <em className="text-faint">Empty answer.</em>}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid size-8 place-items-center rounded-md text-soft transition hover:bg-wash hover:text-ink"
    >
      {children}
    </button>
  );
}
