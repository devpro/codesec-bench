#!/usr/bin/env node
//
// Convert a GitLab SAST report into per sample SARIF under results/.
//
// GitLab analyzers emit gl-sast-report.json, not SARIF, so without this the findings would live only in
// the GitLab UI and could not be scored against the case manifests.
// Converting them means GitLab Advanced SAST goes through the same scoring engine as every local tool,
// and appears in the same generated matrix, which is the only way the comparison stays honest.
//
// The report covers the whole repository in one file, so findings are split by which sample they fall in.
//
// Usage:
//   node scripts/import_gitlab_sast.mjs gl-sast-report.json [tool-name]

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { RESULTS_DIR, loadSamples } from "./bench.mjs";

const [reportPath, toolName = "gitlab-advanced-sast"] = process.argv.slice(2);

if (!reportPath) {
  console.error("usage: import_gitlab_sast.mjs <gl-sast-report.json> [tool-name]");
  process.exit(2);
}

if (!existsSync(reportPath)) {
  console.error(`No such report: ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const samples = loadSamples();

const version = report.scan?.analyzer?.version ?? report.scan?.scanner?.version ?? "unknown";

/**
 * GitLab records CWEs as identifiers of type "cwe", with the value in either `value` or the trailing
 * segment of `name`. Both spellings appear across analyzer versions, so both are read.
 */
function cwesOf(vulnerability) {
  const found = [];
  for (const identifier of vulnerability.identifiers ?? []) {
    if ((identifier.type ?? "").toLowerCase() !== "cwe") continue;
    const raw = String(identifier.value ?? identifier.name ?? "");
    const match = raw.match(/(\d+)/);
    if (match) {
      const tag = `CWE-${match[1]}`;
      if (!found.includes(tag)) found.push(tag);
    }
  }
  return found;
}

// Paths in the report are relative to the repository root, while the bench scores paths relative to a
// sample root, so each finding is attributed to the sample whose directory prefixes it.
const bySample = new Map();

for (const vulnerability of report.vulnerabilities ?? []) {
  const file = vulnerability.location?.file;
  const line = vulnerability.location?.start_line;
  if (!file || line === undefined) continue;

  const sample = samples.find((s) => file.startsWith(`samples/${s.id}/`));
  if (!sample) continue;

  const relative = file.slice(`samples/${sample.id}/`.length);
  const cwe = cwesOf(vulnerability);
  const ruleId =
    vulnerability.identifiers?.[0]?.value ?? vulnerability.cve ?? vulnerability.id ?? "gitlab-finding";

  if (!bySample.has(sample.id)) bySample.set(sample.id, []);
  bySample.get(sample.id).push({
    ruleId: String(ruleId),
    message: { text: vulnerability.message ?? vulnerability.name ?? "" },
    properties: { cwe, severity: vulnerability.severity ?? "Unknown" },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: relative },
          region: { startLine: Number(line) },
        },
      },
    ],
  });
}

if (!bySample.size) {
  console.log("No findings fell inside a sample directory, nothing written.");
}

for (const sample of samples) {
  const results = bySample.get(sample.id);
  // A sample with no findings still gets a file: an empty result set is a measurement, and omitting it
  // would leave the matrix unable to distinguish "found nothing" from "was never run".
  if (!results && !sample.tools?.[toolName]) continue;

  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: { driver: { name: toolName, semanticVersion: version, rules: [] } },
        results: results ?? [],
      },
    ],
  };

  const directory = join(RESULTS_DIR, sample.id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${toolName}.sarif`), `${JSON.stringify(sarif, null, 2)}\n`, "utf8");

  console.log(`${sample.id}: ${(results ?? []).length} finding(s) -> results/${sample.id}/${toolName}.sarif`);
}
