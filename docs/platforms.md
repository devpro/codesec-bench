# Platforms

The bench runs tools locally and on real platforms.

Local runs produce the committed SARIF that every number in [matrix.md](matrix.md) is generated from.
Platform runs exercise features that cannot be reproduced locally at all: push protection, Ultimate tier taint analysis, and the difference between a product's default configuration and its full capability.

## GitHub

Repository: `github.com/devpro/codesec-bench`.

### Push protection blocked the first push, and that is a result

Pushing the Python sample was rejected:

```text
remote: - GITHUB PUSH PROTECTION
remote:     - Push cannot contain secrets
remote:       —— Stripe API Key ——
remote:          - samples/python-flask/src/config.py:9
```

Five locations were flagged, all the same value: the source literal, the two copies inside the committed SARIF, and the two copies in documentation.

What matters is what was **not** flagged.
`src/config.py` contains two credentials on adjacent lines:

Line | Literal                        | Blocked
-----|--------------------------------|--------
8    | a plaintext production password | no
9    | a token with an `sk_live_` prefix | yes

This is an independent confirmation of the strongest secrets finding in this repository.
GitHub secret scanning, Semgrep community rules in Python, TypeScript, Java and C#, all reach the same conclusion: **detection keys on recognisable vendor credential formats, not on what a variable holds.**

A plaintext production database password in a variable named `DATABASE_PASSWORD` passes every detector measured so far.

### How this repository resolves the block

The secret is **not** removed, and its value is **not** weakened.

The bench's core rule is that every published number is generated from committed SARIF that matches committed source.
`results/python-flask/semgrep-community.sarif` contains that literal because Semgrep reported it.
Mutating the source until no detector matches would delete the finding the case exists to measure, and would leave the committed scan output disagreeing with the code it came from.

The correct resolution is the one GitHub documents: follow the unblock URL in the rejection message and allow the secret as **used in tests**.
One bypass covers all five locations, because they are one value.

Push protection stays enabled for the repository.
This is a security repository, so a genuinely leaked credential is a real risk, and the protection is worth keeping for everything that is not a deliberately planted sample.

### Convention for planted credentials

- Planted secrets live in a sample's `src/`, never in a real configuration file that something might load.
- They stay realistic, because realism is the measurement.
- A vendor shaped credential will block the push. Record the bypass, do not weaken the sample.
- Note which detector caught it. That is a free measurement from a tool the bench cannot otherwise run.

### CodeQL

`.github/workflows/codeql.yml` runs CodeQL through `github/codeql-action`, which is published by the `github` organisation and therefore satisfies the actions policy in [AGENTS.md](../AGENTS.md).

Running CodeQL both here and locally is deliberate, and the two are not expected to agree.

Where            | Configuration                | Question it answers
-----------------|------------------------------|-----------------------------------------------
GitHub workflow  | Default query suite          | What is obtained by enabling code scanning
Local CLI        | `security-extended` suite    | What the engine is capable of

The Semgrep pack measurements already showed how much configuration matters: `p/python` alone found one of ten expected findings on the Python sample, while adding `p/default` and `p/secrets` found five.
Reporting a tool at its narrowest setting understates it, and reporting it at its broadest overstates what a team gets by ticking a box.
Both numbers are worth having, and only the platform can produce the first one.

CodeQL does not support PHP, so `php-symfony` is permanently out of scope for it.

## GitLab

Group: `gitlab.com/devpro-labs`, on an Ultimate open source licence.

### Advanced SAST is the most important tool in the bench

`.gitlab-ci.yml` enables it with `GITLAB_ADVANCED_SAST_ENABLED: 'true'`.

Advanced SAST performs **cross-function and cross-file taint analysis**, which is precisely the capability every level 4 case in this repository is constructed to require, and which no free tool measured so far possesses.

It also supports every language in the corpus: C#, Java, JavaScript, TypeScript, PHP, Python.
That makes it the first tool able to attempt all 23 cases.

This repository previously recorded that Advanced SAST did not cover PHP.
That was inherited from older documentation and is now wrong: PHP is supported, with documented limitations around dynamic file inclusion and case-insensitive name resolution.

### What it is expected to change

The strongest claim in this repository is that **level 4 is unreachable**, based on eight expectations across four ecosystems with zero detections.

That claim is explicitly about the free tier.
Advanced SAST is the paid tier built to cross exactly that boundary, so the interesting outcome is not whether it scores higher, but **how much higher, and at which level it stops.**

Level 5 is the real question.
Judging whether a guard is adequate is a different problem from following a value, and cross-file taint does not obviously solve it.
A tool that reaches level 4 and stops at level 5 would sharpen the ladder considerably.

### Results are converted, not screenshotted

GitLab analyzers emit `gl-sast-report.json` rather than SARIF.
`scripts/import_gitlab_sast.mjs` converts it and splits the findings by sample, so Advanced SAST is scored by the same engine as every local tool and lands in the same generated matrix.

Without that step its findings would exist only in the GitLab UI, where they could not be checked against the case manifests, and the comparison would come down to trusting a screenshot.

### Status

Wired but not yet measured.
The pipeline has not run, so no Advanced SAST column exists in the matrix.
Nothing in this repository claims a result before a scan output exists to back it.

## Other platform features worth using

The samples are built for SAST, but the corpus supports more.

Feature                          | Platform | Status
---------------------------------|----------|--------------------------------------------------
Secret detection                 | Both     | Measured incidentally through push protection
Dependency scanning              | GitLab   | Template included, no vulnerable dependency planted yet
Container scanning               | Both     | No image built yet
Security dashboard, MR widgets   | GitLab   | Available once a pipeline runs
Code scanning alerts, PR reviews | GitHub   | Available once the workflow runs

Dependency scanning is the most valuable gap.
The case format already reserves an `sca` category, and no case uses it, because no sample pins a knowingly vulnerable dependency.
