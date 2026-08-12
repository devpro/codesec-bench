# Methodology

How this bench decides whether a tool found a vulnerability.

## The unit of measurement

The unit is the **case**: one deliberately planted defect, at a known location, with a known CWE.
A case is not a file and not a project.
A single sample project usually carries several cases, the way a real codebase carries several defects.

Every case declares, in `case.yaml`, the exact locations where a correct tool must report something.
Nothing in this repository claims a tool detects a case unless a scan output on disk says so.
That rule is absolute: results are read from committed SARIF files, never from memory or from a vendor datasheet.

## Vulnerable and safe pairs

Every case ships two pieces of code:

- the **vulnerable** variant, which must be reported
- the **safe** variant, which must not be reported

The safe variant is deliberately similar in shape.
It uses the same library, the same call, and often the same variable names, differing only in the guard that makes it correct.

Without the safe variant the bench would measure recall alone, and a tool that flags every HTTP call would score perfectly.
The pair is what separates real dataflow analysis from pattern matching on syntax.

## Scoring

For each pair of case and tool, a scan result is classified as follows.

Class            | Meaning
-----------------|--------------------------------------------------------------------------------------
`detected`       | A result lands on an expected location and carries a matching CWE
`partial`        | A result lands on an expected location but reports an unrelated rule or CWE
`missed`         | No result lands on the expected location
`false_positive` | A result lands inside the safe variant of the case
`unexpected`     | A result elsewhere in the sample, neither expected nor in the safe variant

`unexpected` is reported but not counted against a tool.
Sample projects contain ordinary code that may legitimately raise unrelated findings, and treating those as noise would be unfair.
Only the safe variant, which is purpose-built to be correct, counts as a false positive.

A finding inside a safe variant counts as a false positive for the sample **whatever CWE it carries**.
Per-case attribution still requires a CWE match, so that one stray result is not charged to every case sharing a safe file, but the sample total counts every distinct finding landing in safe code.
Without that, a finding matching no case's CWE would be charged to nobody and vanish from the totals, which is how an XSS rule firing on a correctly guarded Express handler initially went unreported.

Two summary numbers are derived per tool:

- **recall**, the share of expected findings classified as `detected`
- **precision proxy**, the share of results on case locations that are not false positives

Location matching allows a small line tolerance, declared per expectation, because tools disagree about whether to report the sink, the assignment, or the enclosing function.

## The difficulty ladder

Cases are graded 1 to 5.
The grade describes what analysis capability is required, not how dangerous the bug is.

Level | Requires                                            | Example
------|-----------------------------------------------------|----------------------------------------------------------------------------------------------
1     | Pattern matching on a single expression             | A hardcoded credential, a disabled certificate check
2     | Dataflow inside one function                        | A request parameter concatenated into a query in the same method
3     | Dataflow across functions in one file               | A private helper that builds the tainted string
4     | Dataflow across files or classes                    | A controller passing user input to a service in another file
5     | Framework knowledge, sanitizer reasoning, or config | A framework binding that is a taint source, or a guard that looks like a sanitizer but is not

Levels 1 and 2 are where most free tools succeed.
Level 4 is where the free and commercial tiers separate, as the PHP SSRF case already demonstrates.
Level 5 is where nearly everything fails, including commercial tools.

A sample set that only contains level 1 cases proves nothing, and a set that only contains level 5 cases produces a table of zeroes.
A useful bench spreads across the ladder, which is why the grade is mandatory in every manifest.

## Categories

`sast` is the current focus.
The case format reserves `secrets`, `sca`, and `iac` so those categories can be added without redesigning the manifest or the scoring script.

The scoring model transfers directly: an SCA case declares an expected finding on a dependency coordinate rather than a source line, and a secrets case declares one on a literal.

## Reproducibility

Tools run as locally installed binaries, never as third party container images.
Reproducibility therefore rests on recording the version that produced each result rather than on pinning an image tag: every scan writes SARIF to `results/<sample>/<tool>.sarif`, those files are committed, and the driver version inside them is reported in the matrix.

A result measured on one version says nothing about another.
The PHP sample already shows why: Semgrep 1.104.0 fails to parse constructor promoted properties and 1.166.0 does not, so the same rules on the same code cover different amounts of the file.

The comparison tables in `docs/matrix.md` are generated from those files by `scripts/render_matrix.mjs`.
They are never edited by hand.
When a table and a SARIF file disagree, the SARIF file is right and the table needs regenerating.
