# Backlog

Known gaps and planned work.

## Tools

- **SonarQube Community** needs a running server, so it does not fit the single command scan model used by the other tools.
  It needs its own task that starts the server, scans, then reads issues and hotspots through the API.
  Hotspots are not returned by `/api/issues/search` and need `/api/hotspots/search`.
  SonarQube is published by SonarSource rather than by GitHub or Docker, so running it locally needs an explicit decision from the repository owner.
- **Bearer** does not complete on the PHP sample at 2.0.2 and is excluded from the default tool set.
  Worth retrying on a later release, and worth checking whether the hang is specific to PHP or to the `secrets,sast` scanner combination.
  It also emits no version in its SARIF driver metadata, so tying a Bearer result to a version needs a separate `bearer version` lookup.
- **Snyk Code** has a free tier worth measuring, unlike the other commercial tools.
- **CodeQL** cannot be measured on PHP, so it only becomes relevant once a supported language is added.

## Samples

Next languages, in order:

1. **Python and JavaScript or TypeScript**, where tool coverage is strongest, including CodeQL.
   These give a baseline for what good support looks like, which the PHP result badly needs for contrast.
2. **Java and C#**, framework heavy taint paths and mature analysers.

Each new sample needs cases spread across the difficulty ladder, not only the easy end.
The PHP sample currently has nothing at level 3 or level 5.

## Case coverage

The PHP sample carries three cases.
Missing, and worth adding to the same sample rather than a new one:

- A level 3 case, dataflow across functions inside one file.
- A level 5 case, either a guard that looks like a sanitizer but is not, or a framework binding acting as a taint source.
- A hardcoded credential case at level 1, which every tool should find and which therefore calibrates the low end.

## Harness

- `scan_roots` and the `rules` map in `sample.yaml` are read but not yet used by `run_scan.sh`, which hardcodes `src`.
- No SCA, secrets or IaC case exists yet, so those branches of the case format are unexercised.
- CI runs nothing.
  `.github/workflows/ci.yml` still contains the commented out PHP job from before the restructure and needs replacing with `task check`.
- The `unexpected` column is always zero so far.
  It stays useful only if samples grow ordinary code alongside the planted defects.
