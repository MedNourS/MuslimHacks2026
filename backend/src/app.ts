// Vercel's build scans for this import to detect a Hono app: see vercel.json.
import "hono";
import { createApp, serveApiDocs, rateLimit } from "@mednours/backon";
import { endpoints } from "./endpoints";
import { exampleMiddleware } from "./middleware/example.middleware";

export const app = createApp();

app.use("*", exampleMiddleware);
// Backstop against any client bug (or actual abuse) hammering the API, e.g. a runaway
// refetch loop from a stale effect dependency. Per-IP, in-memory: fine for a single
// serverless instance under normal load, not a substitute for a shared limiter if this
// ever needs to scale out to real concurrency. 120/min is well above any real page's
// worth of fetches but far below what a tight loop generates.
app.use("*", rateLimit({ windowMs: 60_000, max: 120 }));
app.route("/", endpoints);

serveApiDocs(app, "/docs", { title: "backend" });

// Vercel deploys straight from this export: see vercel.json.
export default app;
