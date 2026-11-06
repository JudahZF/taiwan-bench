import { useSyncExternalStore } from "react";

export type Route =
  | { view: "home" }
  | { view: "new" }
  | { view: "run"; id: string }
  | { view: "families"; family: string | undefined };

const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const runId = hash.match(/^#\/run\/([\w-]+)$/)?.[1];
  if (runId) return { view: "run", id: runId };
  const families = hash.match(/^#\/families(?:\/([\w-]+))?$/);
  if (families) return { view: "families", family: families[1] };
  return hash === "#/new" ? { view: "new" } : { view: "home" };
}

export const navigate = (hash: `#/${string}`) => {
  window.location.hash = hash;
};
