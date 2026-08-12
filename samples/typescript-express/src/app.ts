/**
 * Express entry point for the reporting service.
 *
 * Every handler here is a taint source.
 * The defects live in the modules the handlers call, which is what makes the flows cross-file.
 */

import express, { type Request, type Response } from "express";

import { hashPassword } from "./crypto.js";
import { fetchReport, fetchReportGuarded } from "./fetcher.js";
import { applyPreferences } from "./merge.js";
import { renderSearchPage } from "./render.js";

const app = express();
app.use(express.json());

app.get("/search", (request: Request, response: Response) => {
  const term = String(request.query.term ?? "");

  response.type("html").send(renderSearchPage(term, ["quarterly", "annual"]));
});

app.post("/preferences", (request: Request, response: Response) => {
  const submitted = request.body as Record<string, unknown>;

  response.json(applyPreferences(submitted));
});

app.get("/upstream", async (request: Request, response: Response) => {
  const target = String(request.query.url ?? "");

  response.send(await fetchReport(target));
});

app.get("/upstream/guarded", async (request: Request, response: Response) => {
  const target = String(request.query.url ?? "");

  response.send(await fetchReportGuarded(target));
});

app.post("/register", (request: Request, response: Response) => {
  const password = String((request.body as Record<string, unknown>).password ?? "");

  response.json({ stored: hashPassword(password) });
});

app.listen(8000);
