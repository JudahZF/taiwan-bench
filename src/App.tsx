import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
import { NewRun } from "./components/NewRun.tsx";
import { RunView } from "./components/RunView.tsx";
import { CONTAINER, TopBar } from "./components/TopBar.tsx";
import { navigate, useRoute } from "./router.ts";

export function App() {
  const route = useRoute();
  const runs = useQuery(api.runs.list);
  const latestId = runs?.[0]?._id;

  useEffect(() => {
    if (route.view === "home" && latestId) navigate(`#/run/${latestId}`);
  }, [route.view, latestId]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="flex-1">
        {route.view === "run" && <RunView key={route.id} id={route.id} />}
        {(route.view === "new" || (route.view === "home" && runs?.length === 0)) && <NewRun />}
      </main>
      <footer className={`${CONTAINER} flex flex-wrap gap-x-6 gap-y-1 border-t border-line py-6 text-sm text-soft`}>
        <span>Made by Judah Fuller</span>
        <span>Built with Convex and OpenRouter</span>
      </footer>
    </div>
  );
}
