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

Tool                         | Version | php-symfony | python-flask | typescript-express | java-spring
-----------------------------|---------|-------------|--------------|--------------------|------------
Semgrep OSS, custom rules    | 1.166.0 | 3/5         | not written  | not written        | not written
Opengrep, same custom rules  | 1.22.0  | 3/5         | not written  | not written        | not written
Semgrep OSS, community packs | 1.166.0 | 0/5         | 3/10         | 1/8                | 3/10

Detection tracks the difficulty ladder, not severity:

Level | Requires                   | python-flask | typescript-express | java-spring
------|----------------------------|--------------|--------------------|------------
1     | Nothing, a literal          | 1 of 2       | 1 of 2             | 1 of 2
2     | Dataflow in one function    | 1 of 2       | 0 of 1             | 1 of 2
3     | Across functions, one file  | 1 of 2       | 0 of 1             | 1 of 2
4     | Across files                | 0 of 2       | 0 of 2             | 0 of 2
5     | Judging a guard             | 0 of 2       | 0 of 2             | 0 of 2

**Nothing above level 3 has been detected, in any language, by any tool measured.**

Four findings now replicate across independent ecosystems, which is what makes them worth stating as results rather than anecdotes.

**Level 4 is a property of the analysis, not of the ecosystem.**
The identical CWE-918 cross-file flow is planted in PHP, TypeScript and Java, and missed in all three, at both the source and the sink.
Java has the most mature free security tooling of any language here, which removes the last ecosystem explanation.

**Secret detection keys on vendor prefixes, not on variables.**
`DATABASE_PASSWORD`, `JWT_SIGNING_SECRET` and `SIGNING_KEY` are missed in Python, TypeScript and Java respectively, while a token carrying an `sk_live_` prefix on an adjacent line is reported twice.
The most commonly cited SAST win depends on the credential resembling a vendor's format.

**SQL injection is reported at the sink, not at the mistake.**
In both Python and Java the tool flags the execute call and not the string construction on the line above.
The fix belongs on the line that was not flagged, and the rule would fire identically on a query built from trusted constants.

**Detection does not track severity.**
An MD5 call and a DES cipher are reported; a cross-file SSRF and a defeated traversal guard are not.

The one detected level 3 expectation is worth reading carefully.
`java-spring/xxe-parser-helper` is caught at the parser factory, but that is an **absence** of hardening calls, visible to a syntactic rule, not a flow.
Its cross-function half is missed like every other level 3 flow.

Bearer CLI is excluded: 2.0.2 does not complete on any sample.
Bandit is configured for the Python sample but is not installed, so it has no column yet.

## Claims that did not survive measurement

- A rule documented as detecting CWE-396 had never fired, because Semgrep cannot match PHP try/catch structurally.
- Opengrep, documented as unusable for PHP 8.1 and later, scores identically to Semgrep.
- Bearer, documented as running 70 checks and finding nothing, does not finish at all on its current release.
- Reflected XSS through a template literal is missed in TypeScript, at level 2, although the equivalent string concatenation is heavily covered.
- `p/express` does not exist, and one unresolvable pack makes Semgrep abort a whole scan while still writing a valid, empty SARIF.

Details in [docs/tool-notes.md](docs/tool-notes.md).

## Samples

Sample                                            | Stack                     | Cases | Ladder levels
--------------------------------------------------|---------------------------|-------|--------------
[php-symfony](samples/php-symfony/)               | PHP 8.3, Symfony 7.4      | 3     | 1, 2, 4
[python-flask](samples/python-flask/)             | Python 3.12, Flask 3      | 5     | 1 to 5
[typescript-express](samples/typescript-express/) | TypeScript 5.6, Express 4 | 5     | 1 to 5
[java-spring](samples/java-spring/)               | Java 21, Spring Boot 3    | 5     | 1 to 5

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
