# CodeSec Bench

A workbench for measuring what code security tools actually catch.

Curated samples carry deliberately planted vulnerabilities at known locations.
Tools run against them as code, with the commands to install and run each one, so that every tool can be seen in action and compared on the same defects.
A result is never written by hand: `task report` scans, scores and writes the summary of the run.

Every vulnerable case ships a **safe counterpart**: the same library, the same call, the same variable names, differing only in the guard that makes it correct.
That pair is what separates dataflow analysis from pattern matching, and it is why a false positive column exists at all.

## Tools

Tool                  | Version | Reads                                    | Installed from
----------------------|---------|------------------------------------------|-----------------------------------------------
Semgrep OSS           | 1.180.0 | Every sample, community packs and rules  | PyPI, hashes in `tools/requirements.txt`
Opengrep              | 1.30.2  | The samples with custom rules            | GitHub release, SHA256 pinned
CodeQL                | 2.27.2  | Every sample but PHP                     | CodeQL bundle, checksum file of the release
Trivy                 | 0.76.0  | Dependencies, lock files                 | GitHub release, checksums file of the release
Bandit                | 1.9.4   | Python                                   | PyPI, hashes in `tools/requirements.txt`

Each one runs as a local binary, checked against a SHA256 before it runs, never as a third party container image.
The commands are in [docs/tool-notes.md](docs/tool-notes.md#installing-the-tools), and the pipeline installs the same versions.

## Run it

Needs [Task](https://taskfile.dev/installation/), Node.js 24, `jq`, Python 3 for Semgrep and Bandit, and the tools above.

```bash
npm ci
task report                                        # validate the cases, run every tool on every sample, score
task scan:one SAMPLE=python-flask TOOL=codeql      # one tool on one sample, then: task score
```

The SARIF of every scan and `report/summary.md` land in `report/`, which is not committed.
`task --list` shows every target, and the pipeline keeps the report of each run as an artifact.

## Example run

The summary of the last results committed before runs stopped being kept, with Semgrep 1.166.0, Opengrep 1.22.0 and Trivy 0.73.0.
A cell is the expected findings a tool detected in a sample, out of all of them.

Tool              | Version | dotnet-aspnet | java-spring | php-symfony | python-flask | typescript-express | False positives
------------------|---------|---------------|-------------|-------------|--------------|--------------------|----------------
opengrep          | 1.22.0  | not run       | not run     | 3/5         | not run      | not run            | 1
semgrep-community | 1.166.0 | 2/11          | 3/11        | 0/5         | 3/11         | 1/10               | 2
semgrep-custom    | 1.166.0 | not run       | not run     | 3/5         | not run      | not run            | 1
trivy             | 0.73.0  | 1/11          | 1/11        | not run     | 1/11         | 2/10               | 0

What runs like this one show:

- No tool detects a defect that needs following data across files (level 4 of the [difficulty ladder](docs/methodology.md)), in any of the five languages.
- Secrets are found by their vendor prefix, not by the variable holding them: a `Password=` in a connection string goes unreported.
- SQL injection is reported at the call that runs the query, not at the line that builds it.
- A dependency scanner sees nothing without a lock file.

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
- [tool-notes.md](docs/tool-notes.md) for installing the tools, and their measured limitations, including several that contradict their documentation
- [platforms.md](docs/platforms.md) for GitHub and GitLab integration, and what only a real platform can measure
- [backlog.md](docs/backlog.md) for known gaps and planned work

## Scope

Targets **Linux**, including WSL2, written for `bash`.
The harness is Node.js and bash only.
Python appears as sample code to be scanned, and as the runtime of Semgrep and Bandit.

`sast` and `sca` are measured.
The case format reserves `secrets` and `iac` for later.

SCA cases differ deliberately: they are matched on advisory identifier rather than CWE, since dependency scanners emit no CWE, and they are exempt from the safe counterpart rule, since no dependency version is permanently safe.

Related project: [sonar-samples](https://github.com/devpro/sonar-samples) covers one tool across six stacks, answering whether analysis runs correctly.
This repository covers many tools against curated defects, answering whether the bug is found.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

[MIT](LICENSE) licensed.
