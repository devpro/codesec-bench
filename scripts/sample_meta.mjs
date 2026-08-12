#!/usr/bin/env node
//
// Print one field of a sample's manifest, for consumption by scripts/run_scan.sh.
//
// The runner is bash and cannot read YAML, so this is the bridge that keeps tool configuration in sample.yaml rather than hardcoded per language in the runner.
//
// Usage:
//   node scripts/sample_meta.mjs <sample> roots            # space separated scan roots
//   node scripts/sample_meta.mjs <sample> tools            # space separated tool names configured for this sample
//   node scripts/sample_meta.mjs <sample> args <tool>      # space separated arguments for one tool
//
// Exits 3 when the tool is not configured for the sample, which the runner treats as "skip", not as a failure.

import { loadSamples } from "./bench.mjs";

const [sampleId, field, tool] = process.argv.slice(2);

if (!sampleId || !field) {
  console.error("usage: sample_meta.mjs <sample> <roots|tools|args> [tool]");
  process.exit(2);
}

const sample = loadSamples().find((s) => s.id === sampleId);
if (!sample) {
  console.error(`No such sample: ${sampleId}`);
  process.exit(1);
}

const tools = sample.tools ?? {};

switch (field) {
  case "roots":
    console.log(sample.scanRoots.join(" "));
    break;

  case "tools":
    console.log(Object.keys(tools).join(" "));
    break;

  case "args": {
    if (!tool) {
      console.error("args requires a tool name");
      process.exit(2);
    }
    if (!(tool in tools)) process.exit(3);
    console.log((tools[tool] ?? []).join(" "));
    break;
  }

  default:
    console.error(`Unknown field: ${field}`);
    process.exit(2);
}
