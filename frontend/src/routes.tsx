import { lazy } from "react";
import type { RouteObject } from "react-router";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ElderDetail = lazy(() => import("./pages/ElderDetail"));
// fronton:pages — `bun run add-page` inserts lazy imports above this line
const NotFound = lazy(() => import("./pages/NotFound"));

export const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/circles/:id", element: <ElderDetail /> },
  // fronton:routes — `bun run add-page` inserts route entries above this line
  { path: "*", element: <NotFound /> },
];
