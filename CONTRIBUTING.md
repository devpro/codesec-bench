# Contributing

## The one rule that matters

**Never record a detection without a scan output that shows it.**

Every number in `docs/matrix.md` comes from a committed SARIF file under `results/`, through `scripts/score.mjs`.
The table is generated and must not be edited.
When a table and a SARIF file disagree, the SARIF file is right.

This is not a style preference.
The first measured run of this harness contradicted the hand written table it replaced: a rule documented as detecting CWE-396 had never fired, because Semgrep cannot match PHP try/catch structurally.
Hand maintained result tables drift towards what the author expected to happen.

## Adding a case to an existing sample

1. Write the vulnerable code in the sample's `src/`, and a safe counterpart under `src/Safe/`.
   The counterpart must be as similar as possible: same library, same call, same variable names, differing only in the guard.
   A case without a counterpart measures recall alone and will be rejected by `task validate`.
2. Create `cases/<case-id>/case.yaml`, following [docs/case-format.md](docs/case-format.md).
   Include an `anchor` on every expectation, otherwise validation fails.
3. Create `cases/<case-id>/README.md` explaining the defect, why it sits at its difficulty level, and what the counterpart changes.
4. Run the pipeline and commit what it produces:

```bash
task validate
task scan:sample SAMPLE=<sample>
task score
```

Commit the regenerated `results/**/*.sarif`, `results/scores.json` and `docs/matrix.md` together with the code.

## Adding a sample

1. Create `samples/<stack>/` with a runnable project and a `sample.yaml`.
2. Add cases spread across the difficulty ladder.
   A sample made only of level 1 cases proves nothing, and one made only of level 5 cases produces a table of zeroes.
3. Add the sample to the table in the root `README.md`.

## Adding a tool

Add a branch to `scripts/run_scan.sh` and the name to `TOOLS` in `Taskfile.yml`.

Requirements:

- It is invoked as a **locally installed binary**.
  Third party container images are not used in this repository, for any purpose.
  Add the install command to [docs/tool-notes.md](docs/tool-notes.md).
- It emits SARIF, including a driver version, since that version is what ties a committed result to what produced it.
- It exits through `|| true`, because a scanner that finds nothing and a scanner that crashes both need to be distinguishable from the presence of the output file.

A tool with no local install path is left unwired.
Make the branch fail with an explanation and record it in [docs/backlog.md](docs/backlog.md), rather than reaching for an image as a workaround.

## Difficulty grading

The grade describes the analysis capability required, not how dangerous the bug is.
See [docs/methodology.md](docs/methodology.md).
Grading a level 2 defect as level 4 makes a tool look better than it is when it finds it.

## Writing style

See [AGENTS.md](AGENTS.md).
One sentence per line, no em dashes, no second person.

## Harness language

The harness is Node.js and bash only.
Python appears solely as sample code to be scanned, never as tooling.
