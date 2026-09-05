import { writeFileSync } from "node:fs";
import { generateOpenApiSpec, apiReferenceHtmlInline } from "@mednours/backon";
import { app } from "../src/app";

const spec = generateOpenApiSpec(app, { title: "backend", version: "0.1.0" });
writeFileSync("openapi.json", JSON.stringify(spec, null, 2));
writeFileSync("docs.html", apiReferenceHtmlInline(spec, "backend"));

console.log("Wrote openapi.json and docs.html");
