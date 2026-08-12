/**
 * Correct counterpart of src/app.ts.
 *
 * The same handlers read the same query parameters and bodies, and call the same function names in the safe modules.
 * The taint sources are identical, so a tool reacting to the source rather than to a reachable sink shows up here as a false positive.
 *
 * Any finding reported in this file is a false positive.
 */

import express, { type Request, type Response } from "express";

import { hashPassword } from "./crypto.js";
import { fetchReport } from "./fetcher.js";
import { applyPreferences } from "./merge.js";
import { renderSearchPage } from "./render.js";

const app = express();
app.use(express.json());

app.get("/safe/search", (request: Request, response: Response) => {
  const term = String(request.query.term ?? "");

  response.type("html").send(renderSearchPage(term, ["quarterly", "annual"]));
});

app.post("/safe/preferences", (request: Request, response: Response) => {
  const submitted = request.body as Record<string, unknown>;

  response.json(applyPreferences(submitted));
});

app.get("/safe/upstream", async (request: Request, response: Response) => {
  const target = String(request.query.url ?? "");

  response.send(await fetchReport(target));
});

app.post("/safe/register", (request: Request, response: Response) => {
  const password = String((request.body as Record<string, unknown>).password ?? "");

  response.json({ stored: hashPassword(password) });
});

export { app };
