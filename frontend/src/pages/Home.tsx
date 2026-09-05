import clsx from "clsx";
import { useEffect, useState } from "react";
import { resolveApiBaseUrl } from "@mednours/fronton/client";

export default function Home() {
  const [status, setStatus] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
    // A resolved fetch() alone doesn't prove the backend answered: when
    // Vite's dev-server proxy can't reach the target at all (nothing
    // listening — ECONNREFUSED), it doesn't let the request fail at the
    // network level, it answers the browser itself with a synthetic 502,
    // same as any other HTTP response fetch() would resolve on. So "up"
    // has to mean "the response wasn't Vite's own proxy-failure 502" —
    // a real 404 from the backend for an unmatched route (no route is
    // guaranteed to exist at "/" yet) still counts as "up", since it
    // proves the proxy actually reached the backend process; only that
    // one specific status means the proxy itself gave up.
    fetch(`${resolveApiBaseUrl()}/api`)
      .then((res) => setStatus(res.status === 502 ? "down" : "up"))
      .catch(() => setStatus("down"));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold text-slate-900">fronton + backon</h1>
      <p className="text-slate-600">
        This project was scaffolded next to a backon backend (`../backend`) — the dev server
        already proxies <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">/api</code> to it, so
        the request below runs with no extra setup.
      </p>
      <p
        className={clsx(
          "rounded-md px-3 py-2 text-sm font-semibold",
          status === "up" && "bg-green-100 text-green-800",
          status === "down" && "bg-red-100 text-red-800",
          status === "checking" && "bg-slate-100 text-slate-600"
        )}
      >
        Backend: {status}
      </p>
    </div>
  );
}
