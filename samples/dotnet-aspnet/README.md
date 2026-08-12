# dotnet-aspnet

An ASP.NET Core reporting service carrying five cases, one at each level of the difficulty ladder.

The actions in `ReportController` are the taint sources.
The defects live in the services those actions call, so the flows are genuinely cross-file.

## Cases

Case                                                    | Difficulty               | CWE              | Requires
--------------------------------------------------------|--------------------------|------------------|-----------------------------
[weak-crypto-and-secret](cases/weak-crypto-and-secret/) | 1 syntax                 | CWE-327, CWE-798 | Nothing, single expressions
[sql-injection-concat](cases/sql-injection-concat/)     | 2 intra-procedural       | CWE-89           | Dataflow inside one method
[xml-resolver-helper](cases/xml-resolver-helper/)       | 3 cross-function         | CWE-611          | A document across two methods
[ssrf-crossfile](cases/ssrf-crossfile/)                 | 4 cross-file             | CWE-918          | A call into another class
[path-guard-startswith](cases/path-guard-startswith/)   | 5 framework or sanitizer | CWE-22           | Judging a prefix comparison

Measured detection results are in [docs/matrix.md](../../docs/matrix.md).

## What this sample shows

Two of ten expected findings are detected, and **one of them should not be believed**.

### The level 5 result is an artefact

`path-guard-startswith/guarded-read` is the only level 5 expectation recorded as detected anywhere in this repository.

The rule responsible, `unsafe-path-combine`, also fires on `src/Safe/SafeReportFileService.cs`, which is correctly guarded.
It flags path operations indiscriminately and is not reading the guard at all.

Without the safe counterpart this would have been published as a genuine level 5 detection.
It is the clearest possible argument for pairing every case, and the full analysis is in [that case's README](cases/path-guard-startswith/).

### Level 1 is missed entirely

Both level 1 expectations are missed, which has not happened in any other sample.

MD5 is not reported here, although MD5 is reported in the TypeScript sample and DES is reported in the Java sample.
The connection string password is not reported either, despite carrying the literal keyword `Password=`, which is the most recognisable credential shape there is.

That last one is the fourth language in which a hardcoded secret goes unreported.

### The XXE asymmetry

`xml-resolver-helper` is deliberately the mirror image of the Java XXE case.

Sample        | Shape of the defect                             | Detected
--------------|-------------------------------------------------|---------
java-spring   | **Absence** of hardening calls on the factory    | yes
dotnet-aspnet | **Presence** of a call removing platform hardening | no

Both are single expressions, so both are reachable by a syntactic rule.
Only the absence form is covered.

This is worth knowing, because the presence form is the more alarming of the two.
Undoing a safe default is a deliberate act that someone wrote on purpose, while an unhardened factory is usually an oversight.

## Layout

```text
src/
  ReportController.cs     # ASP.NET Core actions, the taint sources
  CryptoService.cs        # MD5 and a connection string password
  ReportRepository.cs     # SQL injection through concatenation
  XmlIngestService.cs     # XXE, resolver reassigned in a helper
  UpstreamClient.cs       # SSRF sink
  ReportFileService.cs    # the StartsWith containment guard
  Safe/                   # correct counterpart of every class above
cases/                    # case manifests and their documentation
```

Anything reported inside `src/Safe/` is a false positive.

## Scanning

From the repository root:

```bash
task scan:sample SAMPLE=dotnet-aspnet
task score
```

## Building

The sample is not wired to a build.
Semgrep parses C# from source without compiling, so no toolchain is needed to reproduce the results.

A build becomes necessary only for tools that analyse assemblies, such as the Roslyn security analysers, which are on the backlog.
