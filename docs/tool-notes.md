# Tool notes

Measured behaviour, with the command that produced it.
Anything in this file was observed on this repository, not read from a vendor page.

Tools run as locally installed binaries.
No third party container image is used, so each result is tied to the version recorded in its SARIF output rather than to a pinned image tag.
The versions in [matrix.md](matrix.md) are the ones that produced the committed results.

## Installing the tools

```bash
# Semgrep OSS
pipx install semgrep

# Opengrep
curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | bash

# Bearer CLI
curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh | sudo sh -s -- -b /usr/bin
```

## Semgrep OSS

Measured on 1.166.0, and on 1.104.0 where noted.

### PHP try/catch cannot be matched structurally

Every structural pattern for a catch clause returns zero results, including a bare `try { ... }`:

```yaml
- pattern: try { ... } catch (\Throwable $E) { ... }   # 0 findings
- pattern: catch (\Throwable $E) { ... }               # 0 findings
- pattern: catch (Throwable $E) { ... }                # 0 findings
- pattern: try { ... }                                 # 0 findings
```

Only a regex works:

```yaml
- pattern-regex: 'catch\s*\(\s*\\?(Throwable|Exception)\s+\$\w+\s*\)'   # matches
```

Verified on a two file fixture containing nothing but a try/catch, so the sample code is not the cause.
Reproduced identically on Semgrep 1.166.0 and Opengrep 1.22.0.

The consequence is that CWE-396 in PHP is only reachable through `pattern-regex`, which also matches inside comments and string literals.

The rule shipped in `samples/php-symfony/.semgrep/rules.yaml` used the structural form and silently found nothing until this was measured, while the documentation claimed it detected the case.
That is the reason this repository generates its tables instead of writing them by hand.

### The readonly promoted property parse bug is fixed in recent versions

Semgrep 1.104.0 fails to parse PHP 8.1 constructor promoted properties:

```text
[WARN] Syntax error at line src/Service/ApiClient.php:25
Partially scanned: 4 files only partially analyzed due to parsing or internal Semgrep errors
```

Line 25 is `private readonly HttpClientInterface $httpClient,`.

Semgrep 1.166.0 reports `<none>` partially analyzed on the same sample, so the bug is fixed.
This repository previously documented the bug as specific to Opengrep.
It was not: it affected Semgrep too, and the accurate statement is that it is version dependent.

### Community packs find nothing on PHP, and the pack selection is not the reason

Zero results on the PHP sample with the language pack alone, and still zero with `p/default`, `p/secrets` and `p/owasp-top-ten` added.
The community column is configured at its broadest in `sample.yaml` precisely so that a zero cannot be blamed on a stingy rule selection.

SSRF detection needs cross-file taint tracking, which is a paid tier feature.

### Pack selection matters enormously on Python

On the Python sample the same argument goes the other way:

Configuration                        | Findings
-------------------------------------|---------
`p/python` alone                     | 1
`p/security-audit`                   | 1
`p/secrets`                          | 2
`p/default`                          | 4
`p/default` and `p/secrets` together | 5

Measuring the community tier with only the language pack would have understated it by a factor of five.
Anyone comparing tools should check which packs the comparison used before believing the numbers.

### An unresolvable rule pack aborts the entire scan, silently

`p/express` and `p/spring` do not exist.
The registry answers 404, and Semgrep then abandons the whole run rather than continuing with the packs that did resolve:

```text
[ERROR] Failed to download configuration from https://semgrep.dev/c/p/express HTTP 404.
[ERROR] invalid configuration file found (1 configs were invalid)
```

The damaging part is what it writes.
The same invocation without `p/express` reports 4 findings; with it, Semgrep exits 7 and still produces a well formed SARIF file containing zero results.

A harness that ignores the exit status records that as "the tool found nothing".
This one did, briefly, and reported 0 of 8 on the TypeScript sample before the cause was found.
`scripts/run_scan.sh` now refuses to record output from any scanner exiting above 1, since 0 and 1 are the only conventional non-error codes.

Anyone comparing tools should check the exit status as well as the finding count.

Every pack is now verified to resolve before it is added to a `sample.yaml`.
Two of the plausible looking framework packs tried so far, `p/express` and `p/spring`, do not exist.

### Template literal interpolation is not covered for XSS

`src/render.ts` in the TypeScript sample interpolates a query parameter into HTML:

```typescript
const heading = `<h1>Results for ${term}</h1>`;   // not reported
```

This is reflected XSS at level 2 of the ladder, in the best supported language, and it is missed.

String concatenation into HTML is a heavily covered pattern, because `+` is an operator a rule can match on.
Template interpolation is syntax, and `${...}` appears not to be reached by the rules covering the concatenation form.

The two spellings are equivalent and idiomatic TypeScript prefers the template literal, so writing the idiomatic version loses the detection.

### Secret detection keys on vendor prefixes, not on variables

In `src/config.py` of the Python sample, two adjacent lines are treated completely differently:

```python
DATABASE_PASSWORD = "pr0d-Reporting-2024!"                        # not reported
SERVICE_API_TOKEN = "sk_live_9f2a4c8e1b7d3f6a0c5e8b2d4f7a1c9e"    # reported, twice
```

The token matches `sk_live_`, a recognisable provider prefix, and fires two separate rules.
The plaintext production password in a variable named `DATABASE_PASSWORD` fires nothing.

The TypeScript sample replicates this exactly:

```typescript
export const JWT_SIGNING_SECRET = "s3cr3t-jwt-signing-key-do-not-share";   // not reported
```

The Java sample makes it three:

```java
private static final String SIGNING_KEY = "reporting-signing-key-2024";   // not reported
```

The C# sample makes it four, and is the most striking of them:

```csharp
"Server=reporting-db.internal;...;Password=Pr0d-Reporting-2024;"   // not reported
```

That value carries the literal keyword `Password=`, the most recognisable credential shape there is, and is still unreported.

Four languages, four rule sets, the same behaviour.
This is worth knowing before relying on a secrets scanner: it recognises vendor credential formats, it does not reason about what a variable holds.

### Rule coverage is not uniform across ecosystems

The same defect class at the same ladder level is covered inconsistently:

Defect                               | Language   | Detected
-------------------------------------|------------|-----------
`createHash("md5")`                  | TypeScript | yes
`Cipher.getInstance("DES/ECB/...")`  | Java       | yes, twice
`MD5.Create()`                       | C#         | no
Unhardened `DocumentBuilderFactory`  | Java       | yes
`XmlResolver = new XmlUrlResolver()` | C#         | no

The two XML entries are worth separating.
Java is caught for an **absence** of hardening calls; C# undoes a safe platform default with an explicit assignment and is not caught.
Both are single expressions with named types, so both are syntactically reachable, and only the absence form is covered.

A tool comparison run in one language does not transfer to another.

### A rule can appear to detect a level 5 defect while flagging everything

`unsafe-path-combine` reports the vulnerable path read in the C# sample, which scored as the only level 5 detection in the bench.

It also reports the correctly guarded counterpart:

```text
src/ReportFileService.cs:30          broken guard      reported
src/Safe/SafeReportFileService.cs:26 correct guard     reported
```

The rule flags path operations indiscriminately and is not reading the guard at all.

Without a safe counterpart to compare against, this would have been recorded and published as a genuine level 5 result.
It is the strongest argument in this repository for pairing every case.

## Opengrep

Measured on 1.22.0.

Opengrep scores identically to Semgrep with the same custom rules: 3 of 5 detected, 1 false positive.
It is a drop-in replacement for this workload, with the same rule format, the same `--config` flag and the same SARIF output.

### The readonly parse bug is still present, and does not matter here

```text
[WARN] Syntax error at line src/Service/ApiClient.php:25
[WARN] Syntax error at line src/Controller/ApiController.php:22
Partially scanned: 4 files only partially analyzed due to parsing or internal Opengrep errors
```

Opengrep 1.22.0 still fails on `private readonly Type $var`, unlike current Semgrep.

This repository previously concluded that Opengrep "is not usable for PHP 8.1+ codebases at this time".
That conclusion is wrong.
Analysis recovers after the failed constructor and continues through the rest of the file, and Opengrep finds every result Semgrep finds on this sample.

Partial analysis is still a real risk, since a defect inside an unparsed region would be missed silently.
The honest statement is that coverage is incomplete and the tool does not fail loudly about it, not that the tool is unusable.

## Bearer CLI

**Does not complete on this sample.**
Excluded from the default tool set, and still runnable through `task scan:one SAMPLE=php-symfony TOOL=bearer`.

Bearer 2.0.2 ran for more than twenty-five minutes on six PHP files without producing output, holding two `processing-worker` processes the whole time, and had to be killed.
A scanner that cannot finish on a sample this small is not usable in a bench that runs every tool over every sample.

For reference, Bearer 1.47.0 did finish on the same code and reported zero results with `--scanner secrets,sast`.
Bearer is documented as strong on sensitive data flowing into logs, and the sample contains an exception message carrying an API key being written to a logger, so that was a genuine miss rather than an unsupported category.

Bearer also emits no version in its SARIF driver metadata, so a result from it cannot be tied to a version without a separate lookup.

`scripts/run_scan.sh` applies a `SCAN_TIMEOUT` ceiling, 1800 seconds by default, so a scanner behaving this way now fails the scan rather than stalling the pipeline.

## Bandit

Configured for the Python sample, not installed, so it has no column.

```bash
pipx install bandit
```

## Tools evaluated and set aside

Tool                       | Reason
---------------------------|------------------------------------------------------------------------------------------------
PHPStan                    | Type checker, no taint analysis outside the paid tier, no security rules in the free extensions
Psalm                      | Has genuine inter-procedural taint analysis, produced zero findings on the PHP sample
CodeQL                     | Does not support PHP at all
MegaLinter security flavor | Ships no PHP application SAST, only repository level tools

## Commercial tools

Identified as capable of PHP cross-file taint analysis, not tested because they require paid licences: Snyk Code, Checkmarx One, Veracode.
GitLab Advanced SAST is Ultimate tier only.

This file previously stated that it does not cover PHP.
**That is wrong**, and was inherited from older documentation.
Advanced SAST supports C#, C/C++, Go, Java, JavaScript, TypeScript, Objective-C, PHP, Python, Ruby and Swift, with documented PHP limitations around dynamic file inclusion and case-insensitive name resolution.

It therefore covers every language in this corpus, and performs the cross-function and cross-file taint analysis that every level 4 case here is built to require.
It is wired up in `.gitlab-ci.yml` and not yet measured.
See [platforms.md](platforms.md).

## GitHub secret scanning

Measured incidentally, by being blocked.

Push protection rejected the first push of the Python sample over `samples/python-flask/src/config.py:9`, the token with an `sk_live_` prefix.
It did not object to line 8, a plaintext production database password.

That is a fifth independent confirmation of the secrets finding above, from a detector built by a different vendor on a different codebase.
The full account, and why the secret was kept rather than removed, is in [platforms.md](platforms.md).

## Trivy

Measured on 0.73.0, dependency scanning only.

Trivy detects every dependency case it can see: PyYAML in Python, lodash and axios in TypeScript, Newtonsoft.Json in C#.
Four of four, on the category it addresses.

Its overall ratio in the matrix looks far worse than that, because it is scored against the SAST expectations in the same samples.
The per category breakdown exists for exactly this reason.

### A manifest is not enough, a lock file is

The first run detected nothing outside Python:

Sample             | Manifest present | Lock file present | Detected
-------------------|------------------|-------------------|---------
python-flask       | requirements.txt | not needed        | yes
typescript-express | package.json     | no                | **no**
dotnet-aspnet      | Reporting.csproj | no                | **no**

Adding `package-lock.json` took TypeScript from nothing to 32 findings.
Enabling `RestorePackagesWithLockFile` and restoring took C# from nothing to one.

A `PackageReference` or a `dependencies` entry is invisible on its own.
Only `requirements.txt` works unaided, because a pip requirement is already a resolved pin.

This is worth knowing before trusting a green dependency scan: a repository that does not commit lock files may be reporting clean because there was nothing to read.

### Maven scanning needs a warm local cache, and fails hard without one

The first attempt on `java-spring` produced nothing at all:

```text
FATAL Error remote Maven repository returned 429 Too Many Requests for
  .../spring-boot-starter-parent-3.4.1.pom
```

Trivy resolves the parent POM over the network to compute the effective dependency set.
Maven Central rate limited the request, trivy aborted, and no output was written.

That was recorded as **unmeasured, not as a miss**, because the sample pins log4j-core 2.14.1 and publishing a zero caused by an HTTP 429 would have been a false result.

Trivy exits 1 both when it has findings and when it fails fatally, so the exit code cannot distinguish the two.
Only the absent output file does, which is why `scripts/run_scan.sh` refuses to record a scan that wrote nothing.

After installing Maven and running `mvn dependency:resolve` once to warm `~/.m2`, the same command reported 70 findings and detected Log4Shell at `pom.xml:47`.

The lesson is about the harness as much as the tool.
A dependency scan can fail for reasons that have nothing to do with the code, and a harness that records the empty result would publish a clean bill of health for a manifest containing the most consequential vulnerability of the last decade.

### The planted defect was 1 finding in 64

The same run reported 63 further advisories, all against transitive dependencies of an ordinary, current Spring Boot starter:

Package                                     | Advisories
--------------------------------------------|-----------
`org.apache.tomcat.embed:tomcat-embed-core` | 26
`org.springframework:spring-webmvc`         | 12
`org.springframework:spring-expression`     | 3
others                                      | 22

Every one of them is reported against `pom.xml:1`, because a transitive dependency has no declaration line to point at.

Two consequences worth knowing.

The deliberately planted Log4Shell is **one finding in sixty four**, and the only reason it stands out here is that this repository declared in advance exactly where it was.
On a real project it arrives in the same undifferentiated list.

Transitive findings are **indistinguishable by location**.
Any workflow that triages by file and line has nothing to work with, and the bench itself can only score direct dependencies for the same reason.

### Dependency findings decay, source findings do not

Trivy reports CVE-2026-27205 against Flask 3.0.3, which was current when this sample was written.

Nothing in the repository changed.
The advisory database did.

This is the structural difference between SCA and SAST in this bench, and it is why dependency cases are exempt from the safe counterpart rule.
A patched version is only safe until it is not, so a safe counterpart would silently decay into a false measurement.
