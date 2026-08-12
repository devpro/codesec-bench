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

Tool                         | Version | php-symfony | python-flask | typescript-express | java-spring | dotnet-aspnet
-----------------------------|---------|-------------|--------------|--------------------|-------------|--------------
Semgrep OSS, custom rules    | 1.166.0 | 3/5         | not written  | not written        | not written | not written
Opengrep, same custom rules  | 1.22.0  | 3/5         | not written  | not written        | not written | not written
Semgrep OSS, community packs | 1.166.0 | 0/5         | 3/10         | 1/8                | 3/10        | 2/10

Detection tracks the difficulty ladder, not severity:

Level | Requires                   | python-flask | typescript-express | java-spring | dotnet-aspnet
------|----------------------------|--------------|--------------------|-------------|--------------
1     | Nothing, a literal          | 1 of 2       | 1 of 2             | 1 of 2      | 0 of 2
2     | Dataflow in one function    | 1 of 2       | 0 of 1             | 1 of 2      | 1 of 2
3     | Across functions, one file  | 1 of 2       | 0 of 1             | 1 of 2      | 0 of 2
4     | Across files                | 0 of 2       | 0 of 2             | 0 of 2      | 0 of 2
5     | Judging a guard             | 0 of 2       | 0 of 2             | 0 of 2      | 1 of 2

**No genuine detection above level 3 exists anywhere in this bench.**

The single level 5 entry is an artefact and should not be read as a detection.
The rule that produced it, `unsafe-path-combine`, fires on the correctly guarded counterpart as well, so it flags path operations indiscriminately rather than reading the guard.
Without the safe counterpart it would have been published as a real result.
See [the case](samples/dotnet-aspnet/cases/path-guard-startswith/).

Five findings now replicate across independent ecosystems, which is what makes them results rather than anecdotes.

**Level 4 is a property of the analysis, not of the ecosystem.**
The identical CWE-918 cross-file flow is planted in PHP, TypeScript, Java and C#, and missed in all four, at both the source and the sink.
Eight expectations, four ecosystems spanning the full range of free tool maturity, zero detections.
This is the most reproducible result here, and the one worth quoting to anyone deciding whether free SAST is sufficient.

**Secret detection keys on vendor prefixes, not on variables.**
Hardcoded secrets are missed in all four languages.
The C# case even embeds the literal keyword `Password=` inside a connection string and is still unreported, while a token carrying an `sk_live_` prefix in the Python sample is reported twice.

**SQL injection is reported at the sink, not at the mistake.**
In Python, Java and C# the tool flags the execute or command call, never the string construction on the line above.
The fix belongs on the line that was not flagged, and the rule would fire identically on a query built from trusted constants.

**Rule coverage is not uniform across ecosystems.**
An MD5 call is reported in TypeScript and missed in C#.
An unhardened XML parser is reported in Java, while a call that removes .NET's safe default is missed.
A comparison run in one language does not transfer to another.

**Detection does not track severity.**
Weak hashes and ciphers are reported; cross-file SSRF and defeated guards are not.

The one genuine level 3 detection needs its caveat.
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
[dotnet-aspnet](samples/dotnet-aspnet/)           | C# 12, ASP.NET Core 8     | 5     | 1 to 5

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
