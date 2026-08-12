# Backlog

Known gaps and planned work.

## Tools

- **GitLab Advanced SAST** is wired in `.gitlab-ci.yml` and not yet measured.
  It is the highest value pending item: Ultimate tier, cross-function and cross-file taint, and it supports every language in the corpus including PHP.
  It is the first tool able to attempt all 23 cases, and the direct test of the level 4 claim.
- **CodeQL** is wired both locally, at `security-extended`, and in `.github/workflows/codeql.yml` at the default suite.
  Neither has run: the CLI is not installed. `docs/tool-notes.md` has the install command.
  The two configurations answer different questions and are expected to disagree, see `docs/platforms.md`.
- **A dependency scanning case.**
  The `sca` category exists in the case format and no case uses it, because no sample pins a knowingly vulnerable dependency.
  Both platforms run dependency scanning already, so this is the cheapest new category to add.

- **Bandit** is configured for the Python sample but not installed, so it has no column.
  `pipx install bandit`, then `task scan` and `task score`.
- **Custom rules for the Python and TypeScript samples.**
  The `semgrep-custom` column is PHP only.
  Writing rules for those cases would show how far a determined rule author gets at levels 3 to 5, which is the question the PHP sample already answers for level 4.
- **Nothing validates the tool map in `sample.yaml` against the tools the runner knows.**
  A typo is currently a silent skip, unlike an unresolvable rule pack, which now fails loudly.
- **SonarQube Community** needs a running server, so it does not fit the single command scan model used by the other tools.
  It needs its own task that starts the server, scans, then reads issues and hotspots through the API.
  Hotspots are not returned by `/api/issues/search` and need `/api/hotspots/search`.
  SonarQube is published by SonarSource rather than by GitHub or Docker, so running it locally needs an explicit decision from the repository owner.
- **Bearer** does not complete on either sample at 2.0.2 and is excluded from the default tool set.
  Worth retrying on a later release, and worth checking whether the hang is specific to the `secrets,sast` scanner combination.
  It also emits no version in its SARIF driver metadata.
- **Snyk Code** has a free tier worth measuring, unlike the other commercial tools.

## Samples

All five planned languages are done.
Further samples are lower value than adding tools: the ladder result is now replicated four times and another language is unlikely to change it.

Each new sample needs cases spread across the difficulty ladder.
`python-flask` and `typescript-express` both cover levels 1 to 5 and are the template to follow.
`php-symfony` has nothing at level 3 or 5.

**SpotBugs with find-sec-bugs** is the obvious next tool for `java-spring`, and **Roslyn security analysers** for `dotnet-aspnet`.
Both analyse compiled output. Both samples now carry a real `pom.xml` and `.csproj`, so the build exists; only Maven is missing locally.

## Case coverage

Missing from `php-symfony`, and worth adding there rather than in a new sample:

- A level 3 case, dataflow across functions inside one file.
- A level 5 case, either a guard that looks like a sanitizer but is not, or a framework binding acting as a taint source.
- A hardcoded credential case at level 1, which would calibrate the low end the way `python-flask` does.

## Harness

- No SCA, secrets or IaC case exists yet, so those branches of the case format are unexercised.
  The Python `hardcoded-credential` case is the closest thing and is still categorised as `sast`.
- The `unexpected` column is zero everywhere.
  It stays useful only if samples grow ordinary code alongside the planted defects, which none currently do.
- `scripts/run_scan.sh` reads tool configuration from `sample.yaml`, but nothing validates that map against the tools the runner actually knows.
  A typo in a tool name is currently a silent skip.
