#!/usr/bin/env node
//
// Validate every case manifest.
//
// Three checks, in order of how often each one catches a real problem:
//
//   1. The manifest matches schema/case.schema.json.
//   2. Every file referenced by an expectation or a safe range exists.
//   3. Every anchor string still sits on the line the manifest claims.
//
// Check 3 is the important one.
// Line numbers rot the moment a sample is edited, and a stale line silently turns a detection into a miss, which would then be published as a tool failure.

import { readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
// The schema is draft 2020-12, which the default Ajv entry point does not support.
import Ajv from "ajv/dist/2020.js";
import { REPO_ROOT, SCHEMA_PATH, loadSamples } from "./bench.mjs";

function readLine(path, number) {
  if (!existsSync(path)) return null;
  const lines = readFileSync(path, "utf8").split("\n");
  return number >= 1 && number <= lines.length ? lines[number - 1] : null;
}

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const errors = [];
const seenIds = new Map();
let caseCount = 0;

for (const sample of loadSamples()) {
  for (const kase of sample.cases) {
    caseCount += 1;
    const manifest = relative(REPO_ROOT, join(kase.dir, "case.yaml"));

    if (!validate(kase.raw)) {
      for (const error of validate.errors) {
        errors.push(`${manifest}: schema: ${error.instancePath || "<root>"}: ${error.message}`);
      }
    }

    const expectedId = `${sample.id}/${kase.name}`;
    if (kase.id !== expectedId) {
      errors.push(`${manifest}: id is '${kase.id}' but the directory implies '${expectedId}'`);
    }
    if (seenIds.has(kase.id)) {
      errors.push(`${manifest}: duplicate id '${kase.id}', already used by ${seenIds.get(kase.id)}`);
    }
    seenIds.set(kase.id, manifest);

    for (const expectation of kase.expected) {
      const target = join(sample.dir, expectation.file);
      if (!existsSync(target)) {
        errors.push(`${manifest}: ${expectation.id}: file not found: ${expectation.file}`);
        continue;
      }
      if (expectation.anchor === null) {
        errors.push(`${manifest}: ${expectation.id}: no anchor, so line ${expectation.line} cannot be verified`);
        continue;
      }
      const content = readLine(target, expectation.line);
      if (content === null) {
        errors.push(`${manifest}: ${expectation.id}: ${expectation.file} has no line ${expectation.line}`);
      } else if (!content.includes(expectation.anchor)) {
        errors.push(
          `${manifest}: ${expectation.id}: anchor not on ${expectation.file}:${expectation.line}\n` +
            `      expected to contain: ${expectation.anchor}\n` +
            `      actual line:         ${content.trim()}`,
        );
      }
    }

    for (const safe of kase.safe) {
      if (!existsSync(join(sample.dir, safe.file))) {
        errors.push(`${manifest}: safe: file not found: ${safe.file}`);
      }
    }

    if (!kase.safe.length) {
      errors.push(`${manifest}: no safe counterpart, so this case measures recall only`);
    }
  }
}

// Overlapping tolerance windows are the subtlest way this bench can lie.
// Two expectations one line apart with tolerance 1 both accept a finding on either line, so a tool that reports only one of them gets credited for both.
// That happened for real: a secrets rule firing on the API token line was also credited as detecting the database password on the line above.
// The scorer assigns one to one and prefers the closest match, which limits the damage but cannot prevent a spare finding spilling onto a neighbour.
// Rejecting the overlap at validation time is what actually prevents it.
for (const sample of loadSamples()) {
  const byFile = new Map();
  for (const kase of sample.cases) {
    for (const expectation of kase.expected) {
      if (!byFile.has(expectation.file)) byFile.set(expectation.file, []);
      byFile.get(expectation.file).push({ kase, expectation });
    }
  }

  for (const [file, entries] of byFile) {
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i];
        const b = entries[j];
        const gap = Math.abs(a.expectation.line - b.expectation.line);
        if (gap > a.expectation.tolerance + b.expectation.tolerance) continue;
        errors.push(
          `${sample.id}: ${file}: tolerance windows overlap between ` +
            `${a.kase.name}#${a.expectation.id} (line ${a.expectation.line}, tolerance ${a.expectation.tolerance}) and ` +
            `${b.kase.name}#${b.expectation.id} (line ${b.expectation.line}, tolerance ${b.expectation.tolerance})\n` +
            `      one finding could be credited to either, tighten the tolerance`,
        );
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} problem(s) across ${caseCount} case(s):\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(`${caseCount} case(s) valid.`);
