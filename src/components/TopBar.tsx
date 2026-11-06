import { Show, SignInButton, UserButton } from "@clerk/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { env } from "../env.ts";
import { VERDICT_META } from "../verdicts.ts";

export const CONTAINER = "mx-auto w-full max-w-[1240px] px-4 sm:px-8";

const LEGEND = ["accurate", "evasive", "false"] as const;

export function TopBar() {
  const isAdmin = useQuery(api.runs.me)?.isAdmin ?? false;
  return (
    <header className={`${CONTAINER} flex flex-wrap items-center gap-x-8 gap-y-3 py-6`}>
      <a href="#/" className="text-[22px] font-bold tracking-tight">
        <span className="text-accurate">Taiwan</span>Bench
      </a>
      <nav className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
        {isAdmin && (
          <a href="#/new" className="border-b border-ink pb-0.5 hover:text-accurate">
            New run
          </a>
        )}
        {env.VITE_CLERK_PUBLISHABLE_KEY && (
          <>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="border-b border-line-strong pb-0.5 text-soft hover:text-ink">Admin</button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </>
        )}
        <ul className="flex items-center gap-5">
          {LEGEND.map((v) => (
            <li key={v} className="flex items-center gap-1.5" title={VERDICT_META[v].text}>
              <span className={`size-2.5 rounded-full ${VERDICT_META[v].bg}`} />
              {VERDICT_META[v].label}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
