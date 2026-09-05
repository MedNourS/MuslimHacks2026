import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold text-slate-900">404</h1>
      <p className="text-slate-600">That page doesn't exist.</p>
      <Link className="text-sm font-semibold text-slate-900 underline" to="/">
        Back home
      </Link>
    </div>
  );
}
