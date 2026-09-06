import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useRoutes } from "react-router";
import { routes } from "./routes";
import "./index.css";

function App() {
  const location = useLocation();
  const element = useRoutes(routes);
  // Keyed by pathname so each real navigation remounts and replays the fade-in — a
  // query-string-only change (e.g. ?inviteCode=) doesn't retrigger it.
  return (
    <div key={location.pathname} className="page-transition">
      {element}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {/* Every route is lazy, so this boundary is required, not optional —
          without it React throws the moment a route resolves. null rather
          than a spinner on purpose: chunks this small resolve fast enough
          that a flashed spinner reads as jank. Put a real skeleton here
          once a route loads something slow. */}
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
