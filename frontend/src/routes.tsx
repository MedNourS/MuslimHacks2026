import { lazy } from "react";
import type { RouteObject } from "react-router";

// Every page is lazy-loaded, so a first visit downloads only the route it
// landed on instead of the whole app. Worth keeping that way as you add
// pages — it's the single biggest thing you can do for load time here, and
// `bun run add-page` writes new entries in this same form.
const Home = lazy(() => import("./pages/Home"));
// fronton:pages — `bun run add-page` inserts lazy imports above this line
const NotFound = lazy(() => import("./pages/NotFound"));

export const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  // fronton:routes — `bun run add-page` inserts route entries above this line
  { path: "*", element: <NotFound /> },
];
