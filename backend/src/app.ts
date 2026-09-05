// Vercel's build scans for this import to detect a Hono app — see vercel.json.
import "hono";
import { createApp, serveApiDocs } from "@mednours/backon";
import { endpoints } from "./endpoints";
import { exampleMiddleware } from "./middleware/example.middleware";

export const app = createApp();

app.use("*", exampleMiddleware);
app.route("/", endpoints);

serveApiDocs(app, "/docs", { title: "backend" });

// Vercel deploys straight from this export — see vercel.json.
export default app;
