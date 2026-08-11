# CodeSec Bench

A workbench for measuring what code security tools actually catch.

Curated samples carry deliberately planted vulnerabilities at known locations.
Tools are run against them, their SARIF output is committed, and the comparison tables are generated from those files.
No result in this repository is claimed without a scan output on disk to back it.

Every vulnerable case ships a **safe counterpart**: the same library, the same call, the same variable names, differing only in the guard that makes it correct.
That pair is what separates dataflow analysis from pattern matching, and it is why a false positive column exists at all.

## Quick start

Needs [Task](https://taskfile.dev/installation/), Node.js 20 or later, `jq`, and the scanners installed locally.
Install commands are in [docs/tool-notes.md](docs/tool-notes.md).

```bash
npm install
task validate                 # check every case manifest against its source
task scan                     # run every tool against every sample
task score                    # score the SARIF files and regenerate the matrix
```

Results land in [docs/matrix.md](docs/matrix.md).
`task ci` runs all three in order, and `task --list` shows every target.

Scanners run as local binaries.
No third party container image is used anywhere in this repository.

## Current results

Detailed tables live in [docs/matrix.md](docs/matrix.md).
The headline from the PHP sample, measured and not asserted:

Tool                         | Version | Detected | False positives
-----------------------------|---------|----------|----------------
Semgrep OSS, custom rules    | 1.166.0 | 3/5      | 1
Opengrep, same custom rules  | 1.22.0  | 3/5      | 1
Semgrep OSS, community packs | 1.166.0 | 0/5      | 0

The two misses are the cross-file SSRF flow, which needs inter-procedural taint analysis that no free PHP tool provides.
The false positive is the custom SSRF rule firing on the correctly guarded counterpart, which is exactly what a syntactic rule does when it cannot see the allowlist above it.

Bearer CLI is excluded: 2.0.2 does not complete on this sample.

Three claims previously recorded here did not survive measurement.
A rule documented as detecting CWE-396 had never fired, because Semgrep cannot match PHP try/catch structurally.
Opengrep, documented as unusable for PHP 8.1+, scores identically to Semgrep.
Bearer, documented as running 70 checks and finding nothing, does not finish at all on its current release.
All three corrections are in [docs/tool-notes.md](docs/tool-notes.md).

## Samples

Sample                              | Stack                | Cases
------------------------------------|----------------------|------
[php-symfony](samples/php-symfony/) | PHP 8.3, Symfony 7.4 | 3

## Docs

- [methodology.md](docs/methodology.md) for how detection is scored and what the difficulty ladder means
- [case-format.md](docs/case-format.md) for the case manifest format
- [tool-notes.md](docs/tool-notes.md) for measured tool limitations, including several that contradict their documentation
- [matrix.md](docs/matrix.md) for the generated comparison tables
- [backlog.md](docs/backlog.md) for known gaps and planned work

## Scope

Targets **Linux**, including WSL2, written for `bash`.
The harness is Node.js and bash only.
Python appears solely as sample code to be scanned.

`sast` is the current focus.
The case format reserves `secrets`, `sca` and `iac` so those categories can be added without redesigning the scoring.

Related project: [sonar-samples](https://github.com/devpro/sonar-samples) covers one tool across six stacks, answering whether analysis runs correctly.
This repository covers many tools against curated defects, answering whether the bug is found.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

[MIT](LICENSE) licensed.
