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

if (errors.length) {
  console.error(`${errors.length} problem(s) across ${caseCount} case(s):\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(`${caseCount} case(s) valid.`);
