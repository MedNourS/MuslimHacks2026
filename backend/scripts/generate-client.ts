// Regenerates client/api.ts from src/endpoints/ — reads *.routes.ts/*.controller.ts
// directly, the same source add-method/remove-method/server-config write to, so there's
// nothing to keep in sync by hand. Safe to re-run any time; nothing here needs updating
// when a route or method is added, removed, or modified — only its output does.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const EXT = "ts";
const TYPED = true;

const root = process.cwd();
const endpointsDir = join(root, "src/endpoints");

const MOUNT_PATTERN = /endpoints\.(?:route|use)\("\/([a-z0-9-]+)"/g;
const METHOD_PATTERN = /\.(get|post|put|patch|delete)\(\s*"([^"]*)"\s*,\s*controller\.(\w+)\s*\)/g;

function paramNames(path: string) {
  return Array.from(path.matchAll(/:([A-Za-z0-9_]+)/g)).map((m) => m[1]);
}

function camelCase(name: string) {
  const parts = name.split("-");
  return parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

// Builds a JS expression string for the full request path — literal
// segments as JSON string literals, :param segments as bare identifiers,
// joined with "+" — e.g. "/users/:id" becomes the text: "/users/" + id
function pathExpr(route: string, method: any) {
  const fullPath = "/" + route + (method.path === "/" ? "" : method.path);
  const pieces = [];
  let lastIndex = 0;
  const paramRe = /:([A-Za-z0-9_]+)/g;
  let match;
  while ((match = paramRe.exec(fullPath))) {
    if (match.index > lastIndex) pieces.push(JSON.stringify(fullPath.slice(lastIndex, match.index)));
    pieces.push(match[1]);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < fullPath.length) pieces.push(JSON.stringify(fullPath.slice(lastIndex)));
  return pieces.join(" + ");
}

function funcArgs(method: any) {
  const args = paramNames(method.path).slice();
  if (method.needsBody) args.push("body");
  if (method.needsQuery) args.push("query");
  return args;
}

function typedFuncArgs(method: any) {
  const parts = paramNames(method.path).map((name) => name + ": string");
  if (method.needsBody) parts.push("body: z.infer<typeof " + method.name + "BodySchema>");
  if (method.needsQuery) parts.push("query: z.infer<typeof " + method.name + "QuerySchema>");
  return parts.join(", ");
}

const indexContents = readFileSync(join(endpointsDir, "index." + EXT), "utf-8");
const routes = Array.from(indexContents.matchAll(MOUNT_PATTERN)).map((m) => m[1]);

const groups = [];
for (const route of routes) {
  let routesContents, controllerContents;
  try {
    routesContents = readFileSync(join(endpointsDir, route, route + ".routes." + EXT), "utf-8");
    controllerContents = readFileSync(join(endpointsDir, route, route + ".controller." + EXT), "utf-8");
  } catch {
    continue; // mounted but missing a file — `bun run doctor` already flags this, skip it here
  }

  const methods = Array.from(routesContents.matchAll(METHOD_PATTERN)).map((m) => ({
    verb: m[1],
    path: m[2],
    name: m[3],
    needsBody: controllerContents.includes(m[3] + "BodySchema"),
    needsQuery: controllerContents.includes(m[3] + "QuerySchema"),
  }));
  if (methods.length > 0) groups.push({ route, methods });
}

if (groups.length === 0) {
  console.log("No endpoints with methods yet — nothing to generate. Run `bun run add-method` first.");
  process.exit(0);
}

const importLines = [];
if (TYPED) {
  importLines.push('import type { z } from "zod";');
  const namesByModule = new Map();
  for (const group of groups) {
    const names = [];
    for (const m of group.methods) {
      if (m.needsBody) names.push(m.name + "BodySchema");
      if (m.needsQuery) names.push(m.name + "QuerySchema");
    }
    if (names.length > 0) namesByModule.set("../src/endpoints/" + group.route + "/" + group.route + ".controller", names);
  }
  for (const [modulePath, names] of namesByModule) {
    importLines.push('import type { ' + names.join(", ") + ' } from "' + modulePath + '";');
  }
}

const helperLines = [
  'const BASE_URL = (typeof process !== "undefined" && process.env.API_BASE_URL) || "";',
  "",
  TYPED ? "async function request<T>(path: string, init?: RequestInit): Promise<T> {" : "async function request(path, init) {",
  "  const res = await fetch(BASE_URL + path, {",
  "    ...init,",
  '    headers: { "Content-Type": "application/json", ...(init && init.headers ? init.headers : {}) },',
  "  });",
  "  if (!res.ok) {",
  TYPED ? "    const errBody: any = await res.json().catch(() => undefined);" : "    const errBody = await res.json().catch(() => undefined);",
  '    throw new Error((errBody && errBody.error && errBody.error.message) || ("Request to " + path + " failed with " + res.status));',
  "  }",
  TYPED ? "  return res.json() as Promise<T>;" : "  return res.json();",
  "}",
];

const groupBlocks = groups.map((group) => {
  const varName = camelCase(group.route) + "Api";
  const methodLines = group.methods.map((m) => {
    const signature = TYPED ? typedFuncArgs(m) : funcArgs(m).join(", ");
    const genericPrefix = TYPED ? "<T = unknown>" : "";

    let call = "request" + (TYPED ? "<T>" : "") + "(" + pathExpr(group.route, m);
    if (m.needsQuery) call += ' + "?" + new URLSearchParams(query' + (TYPED ? " as any" : "") + ").toString()";

    const initParts = [];
    if (m.verb !== "get") initParts.push('method: "' + m.verb.toUpperCase() + '"');
    if (m.needsBody) initParts.push("body: JSON.stringify(body)");
    if (initParts.length > 0) call += ", { " + initParts.join(", ") + " }";
    call += ")";

    return "  " + m.name + ": " + genericPrefix + "(" + signature + ") => " + call + ",";
  });
  return "export const " + varName + " = {\n" + methodLines.join("\n") + "\n};";
});

const header =
  "// Auto-generated by `bun run generate-client` from src/endpoints/ — re-run after adding, removing,\n" +
  "// or modifying methods (add-method/remove-method/server-config all count). Hand edits here are\n" +
  "// overwritten on the next run.\n\n";

const output =
  header +
  (importLines.length > 0 ? importLines.join("\n") + "\n\n" : "") +
  helperLines.join("\n") +
  "\n\n" +
  groupBlocks.join("\n\n") +
  "\n";

mkdirSync(join(root, "client"), { recursive: true });
const outPath = join(root, "client", "api." + EXT);
writeFileSync(outPath, output);
console.log(
  "Wrote " + outPath + " (" + groups.reduce((n, g) => n + g.methods.length, 0) + " method(s) across " + groups.length + " endpoint(s))"
);
