import "@fontsource-variable/outfit";
import "./index.css";
import { ClerkProvider, useAuth } from "@clerk/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { env } from "./env.ts";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);
const clerkKey = env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {clerkKey ? (
      <ClerkProvider publishableKey={clerkKey}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <App />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    ) : (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    )}
  </StrictMode>,
);
