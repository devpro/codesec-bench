# Case format

Every case is a directory under `samples/<stack>/cases/<case-id>/` containing a `case.yaml` manifest and a `README.md`.
The code the case refers to lives in the sample project itself, so that the project stays runnable and realistic.

`schema/case.schema.json` is the authoritative definition.
`task validate` checks every manifest against it.

## Layout

```text
samples/php-symfony/
  sample.yaml                    # stack metadata, scan roots, rule packs
  .semgrep/rules.yaml            # custom rules for the whole sample
  src/                           # the runnable application
    Service/ApiClient.php        # vulnerable variant
    Safe/SafeApiClient.php       # safe variant
  cases/
    ssrf-crossfile/
      case.yaml
      README.md
```

Custom rules live once per sample rather than once per case.
A scanner runs over the whole sample in a single pass and the results are attributed to cases by location, so splitting rules per case would mean rescanning the same code once per case for no gain.

## Minimal manifest

```yaml
id: php-symfony/ssrf-crossfile
title: SSRF through an unvalidated endpoint path
category: sast
difficulty: 4
cwe: [CWE-918]

expected:
  - id: ssrf-sink
    cwe: [CWE-918]
    severity: high
    file: src/Service/ApiClient.php
    line: 45
    tolerance: 3
    requires: cross-file-taint

safe:
  - file: src/Safe/SafeApiClient.php
```

## Fields

Field         | Required | Meaning
--------------|----------|--------------------------------------------------------------------------------
`id`          | yes      | `<stack>/<case-id>`, unique across the repository
`title`       | yes      | One line, describing the defect and not the fix
`category`    | yes      | `sast`, `secrets`, `sca`, or `iac`
`difficulty`  | yes      | 1 to 5, see [methodology.md](methodology.md)
`cwe`         | yes      | The CWE identifiers the case is about
`owasp`       | no       | OWASP Top 10 reference, for example `A10:2021`
`description` | no       | A paragraph explaining why the code is wrong
`expected`    | yes      | One entry per defect a tool must report
`safe`        | no       | Files or ranges that must not be reported

### `expected` entries

Field       | Required | Meaning
------------|----------|------------------------------------------------------------------------------------------
`id`        | yes      | Stable identifier, unique within the case
`cwe`       | yes      | CWEs that count as a correct classification for this finding
`severity`  | yes      | `critical`, `high`, `medium`, or `low`
`file`      | yes      | Path relative to the sample root
`line`      | yes      | The line a tool is expected to anchor on
`tolerance` | no       | Line window either side of `line`, default 3
`requires`  | no       | Capability needed, for example `cross-file-taint`, used to explain misses
`note`      | no       | Why the finding is there, or why a tool plausibly misses it

### `safe` entries

Field     | Required | Meaning
----------|----------|-----------------------------------------------------------
`file`    | yes      | Path relative to the sample root
`lines`   | no       | `[start, end]`, defaults to the whole file
`note`    | no       | What makes this variant correct

Any tool result landing in a `safe` range is a false positive for that case.

## Line numbers drift

`line` points at a specific line of a real file, so editing the code above it invalidates the manifest.
`task validate` compares each expectation against an anchor string, and fails when the anchor is no longer on the expected line.
`anchor` is effectively mandatory: an expectation without one is reported as unverifiable.

```yaml
    line: 45
    anchor: "$this->httpClient->request('GET', $baseUrl . $endpoint"
```

## Tolerance windows must not overlap

`task validate` rejects two expectations in the same file whose tolerance windows touch.

This is the subtlest way the bench can lie about a tool.
Two expectations one line apart, each with tolerance 1, both accept a finding on either line, so a tool reporting only one of them gets credited for both.

That happened for real.
A secrets rule firing on the API token line was also credited as detecting the database password on the line above, turning a genuine 3 of 10 into a flattering 5 of 10.

The scorer assigns findings to expectations one to one and prefers the closest match, which limits the damage, but it cannot stop a spare finding spilling onto a neighbour.
Rejecting the overlap at validation time is what actually prevents it.
Set `tolerance: 0` for expectations on adjacent lines.
