# Backlog

Known gaps and planned work.

## Tools

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
- **CodeQL** supports Python but not PHP, so the Python sample is where it becomes measurable.
  It is the strongest free option for cross-file taint and would be the first tool with a real chance at levels 4 and 5.
- **Snyk Code** has a free tier worth measuring, unlike the other commercial tools.

## Samples

Next: **Java and C#**, for framework heavy taint paths and mature analysers.

Each new sample needs cases spread across the difficulty ladder.
`python-flask` and `typescript-express` both cover levels 1 to 5 and are the template to follow.
`php-symfony` has nothing at level 3 or 5.

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
