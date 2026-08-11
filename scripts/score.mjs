#!/usr/bin/env node
//
// Score committed scan results against the case manifests.
//
// Reads results/<sample>/<tool>.sarif and samples/<sample>/cases/*/case.yaml, then writes results/scores.json.
// Nothing here inspects source code: a tool is credited only for what its SARIF output actually says.
//
// Usage:
//   node scripts/score.mjs [--sample <id>] [--quiet]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { RESULTS_DIR, loadResults, loadSamples, matchesLocation, safeContains } from "./bench.mjs";

const { values } = parseArgs({
  options: { sample: { type: "string" }, quiet: { type: "boolean", default: false } },
});

const intersects = (a, b) => a.some((x) => b.includes(x));

/**
 * Assign findings to expectations, one to one, across every case in the sample.
 *
 * Assignment has to be exclusive and it has to be global.
 * Tolerance windows of neighbouring expectations overlap, and expectations in different cases routinely sit in the same file, so a single result would otherwise be credited several times over and inflate the score.
 *
 * Candidate pairs are ranked by how convincing they are: a matching CWE first, then proximity to the declared line.
 * Greedy assignment over that ranking gives each finding to the expectation it fits best, and leaves the rest unassigned.
 */
function assignFindings(cases, findings) {
  const expectations = cases.flatMap((kase) => kase.expected);
  const candidates = [];

  expectations.forEach((expectation, expectationIndex) => {
    findings.forEach((finding, findingIndex) => {
      if (!matchesLocation(expectation, finding.file, finding.line)) return;
      candidates.push({
        expectationIndex,
        findingIndex,
        cweMatch: intersects(finding.cwe, expectation.cwe),
        distance: Math.abs(finding.line - expectation.line),
      });
    });
  });

  candidates.sort((a, b) => Number(b.cweMatch) - Number(a.cweMatch) || a.distance - b.distance);

  const byExpectation = new Map();
  const consumed = new Set();
  for (const candidate of candidates) {
    if (byExpectation.has(candidate.expectationIndex) || consumed.has(candidate.findingIndex)) continue;
    byExpectation.set(candidate.expectationIndex, candidate);
    consumed.add(candidate.findingIndex);
  }

  const assignment = new Map();
  expectations.forEach((expectation, index) => {
    const candidate = byExpectation.get(index);
    assignment.set(expectation, candidate ? { finding: findings[candidate.findingIndex], cweMatch: candidate.cweMatch } : null);
  });

  return { assignment, consumed };
}

/**
 * Classify one tool's findings against one case, using the sample wide assignment.
 *
 * A finding credited to an expectation is a detection when the tool also reports a matching CWE.
 * When only the location lines up, the outcome is partial: the tool pointed at the right code but classified it as something else, or reported no CWE at all.
 */
function classifyCase(kase, findings, assignment, consumed) {
  const outcomes = kase.expected.map((expectation) => {
    const hit = assignment.get(expectation);
    const status = !hit ? "missed" : hit.cweMatch ? "detected" : "partial";
    return {
      expectation: expectation.id,
      status,
      requires: expectation.requires,
      severity: expectation.severity,
      location: `${expectation.file}:${expectation.line}`,
      evidence: hit && { rule: hit.finding.ruleId, line: hit.finding.line, cwe: hit.finding.cwe },
    };
  });

  // A finding inside a safe range is a false positive, but only for the case whose subject it shares.
  // Without the CWE check, one stray result would be charged to every case that lists the same safe file.
  const falsePositives = [];
  findings.forEach((finding, index) => {
    if (consumed.has(index)) return;
    if (!kase.safe.some((safe) => safeContains(safe, finding.file, finding.line))) return;
    if (finding.cwe.length && !intersects(finding.cwe, kase.cwe)) return;
    falsePositives.push({ rule: finding.ruleId, location: `${finding.file}:${finding.line}`, cwe: finding.cwe });
  });

  const detected = outcomes.filter((o) => o.status === "detected").length;
  const partial = outcomes.filter((o) => o.status === "partial").length;

  return {
    case: kase.id,
    difficulty: kase.difficulty,
    expected: outcomes.length,
    detected,
    partial,
    missed: outcomes.length - detected - partial,
    false_positives: falsePositives.length,
    outcomes,
    false_positive_details: falsePositives,
  };
}

function scoreSample(sample) {
  const tools = {};
  const results = loadResults(sample.id);

  for (const [tool, run] of Object.entries(results).sort(([a], [b]) => a.localeCompare(b))) {
    const { findings, version } = run;
    const { assignment, consumed } = assignFindings(sample.cases, findings);
    const cases = sample.cases.map((kase) => classifyCase(kase, findings, assignment, consumed));

    const accounted = new Set();
    for (const kase of sample.cases) {
      for (const finding of findings) {
        const onExpectation = kase.expected.some((e) => matchesLocation(e, finding.file, finding.line));
        const onSafe = kase.safe.some((s) => safeContains(s, finding.file, finding.line));
        if (onExpectation || onSafe) accounted.add(`${finding.ruleId}|${finding.file}|${finding.line}`);
      }
    }

    const unexpected = findings
      .filter((f) => !accounted.has(`${f.ruleId}|${f.file}|${f.line}`))
      .map((f) => ({ rule: f.ruleId, location: `${f.file}:${f.line}`, cwe: f.cwe }));

    const sum = (key) => cases.reduce((total, c) => total + c[key], 0);
    const expected = sum("expected");
    const detected = sum("detected");
    const partial = sum("partial");

    tools[tool] = {
      version,
      cases,
      totals: {
        expected,
        detected,
        partial,
        missed: expected - detected - partial,
        false_positives: sum("false_positives"),
        unexpected: unexpected.length,
        recall: expected ? Math.round((detected / expected) * 1000) / 1000 : null,
      },
      unexpected_details: unexpected,
    };
  }

  return {
    sample: sample.id,
    title: sample.title,
    language: sample.language,
    case_count: sample.cases.length,
    expectation_count: sample.cases.reduce((total, c) => total + c.expected.length, 0),
    tools,
  };
}

const samples = loadSamples().filter((s) => !values.sample || s.id === values.sample);
if (!samples.length) {
  console.error(`No sample matched '${values.sample}'.`);
  process.exit(1);
}

const report = { samples: samples.map(scoreSample) };

mkdirSync(RESULTS_DIR, { recursive: true });
writeFileSync(join(RESULTS_DIR, "scores.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (!values.quiet) {
  for (const entry of report.samples) {
    console.log(`\n${entry.sample}: ${entry.case_count} cases, ${entry.expectation_count} expected findings`);
    if (!Object.keys(entry.tools).length) {
      console.log(`  no scan results on disk, run: task scan:sample SAMPLE=${entry.sample}`);
      continue;
    }
    for (const [tool, data] of Object.entries(entry.tools)) {
      const t = data.totals;
      console.log(
        `  ${tool.padEnd(22)} detected ${t.detected}/${t.expected}` +
          `  partial ${t.partial}  missed ${t.missed}` +
          `  false positives ${t.false_positives}  unexpected ${t.unexpected}`,
      );
    }
  }
  console.log("\nWrote results/scores.json");
}
