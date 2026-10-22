#!/usr/bin/env node
//
// Write report/summary.md from report/scores.json: one table, a row per tool and a column per sample.
//
// A cell is the expected findings the tool detected in that sample, out of all of them.
// False positives are findings inside the safe counterpart of a case, summed over the samples.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { REPORT_DIR, loadSamples } from "./bench.mjs";

/**
 * Render a Markdown table with every pipe aligned.
 *
 * markdownlint enforces the aligned style, so the table pads its cells rather than emit them compactly.
 */
function table(header, rows) {
  const widths = header.map((cell, index) =>
    Math.max(cell.length, ...rows.map((row) => String(row[index] ?? "").length)),
  );
  const line = (cells) => cells.map((cell, index) => String(cell ?? "").padEnd(widths[index])).join(" | ").trimEnd();
  return [line(header), widths.map((width) => "-".repeat(width)).join("-|-"), ...rows.map(line)];
}

const scoresPath = join(REPORT_DIR, "scores.json");
if (!existsSync(scoresPath)) {
  console.error("report/scores.json not found, run: task score");
  process.exit(1);
}

const report = JSON.parse(readFileSync(scoresPath, "utf8"));
const samples = loadSamples().map((sample) => sample.id);
const bySample = new Map(report.samples.map((entry) => [entry.sample, entry]));
const tools = [...new Set(report.samples.flatMap((entry) => Object.keys(entry.tools)))].sort();

const rows = tools.map((tool) => {
  const runs = samples.map((sample) => bySample.get(sample)?.tools[tool]).filter(Boolean);
  // A tool records its version in each SARIF file, which one run gives once.
  const versions = [...new Set(runs.map((run) => run.version ?? "unknown"))].join(", ");
  const cells = samples.map((sample) => {
    const run = bySample.get(sample)?.tools[tool];
    return run ? `${run.totals.detected}/${run.totals.expected}` : "not run";
  });
  const falsePositives = runs.reduce((total, run) => total + run.totals.false_positives, 0);
  return [tool, versions, ...cells, String(falsePositives)];
});

const lines = [
  "# Scan summary",
  "",
  `Run on ${new Date().toISOString().slice(0, 10)} with \`task report\`.`,
  "",
  "A cell is the expected findings a tool detected in a sample, out of all of them, and `not run` a tool that does not apply to the sample or is not installed.",
  "False positives are findings inside the safe counterpart of a case.",
  "",
  ...table(["Tool", "Version", ...samples, "False positives"], rows),
];

writeFileSync(join(REPORT_DIR, "summary.md"), `${lines.join("\n")}\n`, "utf8");
console.log("Wrote report/summary.md");
