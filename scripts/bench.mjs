// Shared model for the bench: samples, cases, and SARIF results.
//
// Loading and normalisation live here so that validate_cases, score and render_matrix agree on what a case is and on how a SARIF result is read.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SAMPLES_DIR = join(REPO_ROOT, "samples");
export const RESULTS_DIR = join(REPO_ROOT, "results");
export const SCHEMA_PATH = join(REPO_ROOT, "schema", "case.schema.json");

export const DEFAULT_TOLERANCE = 3;

const CWE_PATTERN = /CWE[-_ ]?(\d+)/gi;

/**
 * Compare a path from a SARIF file with a path from a manifest.
 *
 * Tools disagree about path prefixes: absolute paths, a leading slash, or a container mount point such as /src.
 * Comparing on the longest common suffix of path segments avoids encoding each tool's convention here.
 */
export function samePath(reported, declared) {
  const split = (p) => p.replace(/\\/g, "/").split("/").filter((s) => s && s !== ".");
  const a = split(reported);
  const b = split(declared);
  if (!a.length || !b.length) return false;
  const n = Math.min(a.length, b.length);
  return a.slice(-n).join("/") === b.slice(-n).join("/");
}

/**
 * Pull CWE identifiers out of arbitrary SARIF fragments.
 *
 * SARIF has at least four places a CWE can hide: rule properties, rule tags, taxa relationships, and free text in the help or the message.
 * Rather than encode every tool's choice, serialise the fragment and read every CWE reference out of it.
 */
export function extractCwes(...blobs) {
  const found = [];
  for (const blob of blobs) {
    if (blob === null || blob === undefined) continue;
    const text = typeof blob === "string" ? blob : JSON.stringify(blob);
    for (const match of text.matchAll(CWE_PATTERN)) {
      const tag = `CWE-${match[1]}`;
      if (!found.includes(tag)) found.push(tag);
    }
  }
  return found;
}

export function matchesLocation(expectation, file, line) {
  return samePath(file, expectation.file) && Math.abs(line - expectation.line) <= expectation.tolerance;
}

export function safeContains(safe, file, line) {
  if (!samePath(file, safe.file)) return false;
  if (!safe.lines) return true;
  return line >= safe.lines[0] && line <= safe.lines[1];
}

function loadCase(manifestPath, sampleId) {
  const raw = yaml.load(readFileSync(manifestPath, "utf8"));
  return {
    id: raw.id,
    title: raw.title,
    category: raw.category,
    difficulty: raw.difficulty,
    cwe: raw.cwe,
    owasp: raw.owasp ?? "",
    description: (raw.description ?? "").trim(),
    dir: dirname(manifestPath),
    name: dirname(manifestPath).split(sep).pop(),
    sample: sampleId,
    raw,
    expected: (raw.expected ?? []).map((e) => ({
      caseId: raw.id,
      id: e.id,
      cwe: e.cwe,
      severity: e.severity,
      file: e.file,
      line: e.line,
      anchor: e.anchor ?? null,
      tolerance: e.tolerance ?? DEFAULT_TOLERANCE,
      requires: e.requires ?? "none",
      note: (e.note ?? "").trim(),
    })),
    safe: (raw.safe ?? []).map((s) => ({
      file: s.file,
      lines: s.lines ?? null,
      note: (s.note ?? "").trim(),
    })),
  };
}

export function loadSamples() {
  if (!existsSync(SAMPLES_DIR)) return [];
  const samples = [];

  for (const entry of readdirSync(SAMPLES_DIR).sort()) {
    const sampleDir = join(SAMPLES_DIR, entry);
    const manifest = join(sampleDir, "sample.yaml");
    if (!statSync(sampleDir).isDirectory() || !existsSync(manifest)) continue;

    const raw = yaml.load(readFileSync(manifest, "utf8"));
    const casesDir = join(sampleDir, "cases");
    const cases = [];

    if (existsSync(casesDir)) {
      for (const caseName of readdirSync(casesDir).sort()) {
        const caseManifest = join(casesDir, caseName, "case.yaml");
        if (existsSync(caseManifest)) cases.push(loadCase(caseManifest, raw.id));
      }
    }

    samples.push({
      id: raw.id,
      title: raw.title,
      language: raw.language,
      languageVersion: String(raw.language_version ?? ""),
      framework: raw.framework ?? "",
      runnable: Boolean(raw.runnable),
      scanRoots: raw.scan_roots ?? ["src"],
      // Which tools apply to this sample, and the arguments each one needs.
      // A tool absent from the map is skipped for the sample rather than run with defaults that would not fit the language.
      tools: raw.tools ?? {},
      codeqlLanguage: raw.codeql_language ?? null,
      dir: sampleDir,
      cases,
    });
  }
  return samples;
}

/**
 * Flatten a SARIF file into findings, tolerating the dialect differences between tools.
 *
 * The driver version is read out alongside the findings.
 * Tools run as local binaries rather than pinned images, so the version recorded in the output is the only thing tying a committed result to what produced it.
 */
export function loadSarif(path, tool) {
  const document = JSON.parse(readFileSync(path, "utf8"));
  const findings = [];
  let version = null;

  for (const run of document.runs ?? []) {
    const driver = run.tool?.driver ?? {};
    version ??= driver.semanticVersion ?? driver.version ?? null;
    const rulesById = new Map((driver.rules ?? []).filter((r) => r.id).map((r) => [r.id, r]));

    for (const result of run.results ?? []) {
      const ruleId = result.ruleId ?? result.rule?.id ?? "unknown";
      const rule = rulesById.get(ruleId) ?? {};
      const cwe = extractCwes(rule, result.properties, result.message);
      const message = (result.message?.text ?? "").trim();

      for (const location of result.locations?.length ? result.locations : []) {
        const physical = location.physicalLocation ?? {};
        const uri = physical.artifactLocation?.uri;
        const line = physical.region?.startLine;
        if (!uri || line === undefined) continue;
        findings.push({ tool, ruleId, file: uri, line: Number(line), cwe, message });
      }
    }
  }
  return { findings, version: version ?? "unknown" };
}

/** Read every committed SARIF file for a sample, keyed by tool name. */
export function loadResults(sampleId) {
  const directory = join(RESULTS_DIR, sampleId);
  if (!existsSync(directory)) return {};
  const results = {};
  for (const file of readdirSync(directory).sort()) {
    if (!file.endsWith(".sarif")) continue;
    const tool = file.replace(/\.sarif$/, "");
    results[tool] = loadSarif(join(directory, file), tool);
  }
  return results;
}
