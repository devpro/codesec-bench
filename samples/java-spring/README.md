# java-spring

A Spring Boot reporting service carrying five cases, one at each level of the difficulty ladder.

The handlers in `ReportController` are the taint sources.
The defects live in the services those handlers call, so the flows are genuinely cross-file.

Java has the most mature security tooling of any language in this repository.
It is the ecosystem where free tools have had the longest to get good, which makes its results the fairest test of the ladder.

## Cases

Case                                                      | Difficulty               | CWE              | Requires
----------------------------------------------------------|--------------------------|------------------|-----------------------------
[weak-crypto-and-secret](cases/weak-crypto-and-secret/)   | 1 syntax                 | CWE-327, CWE-798 | Nothing, single expressions
[sql-injection-concat](cases/sql-injection-concat/)       | 2 intra-procedural       | CWE-89           | Dataflow inside one method
[xxe-parser-helper](cases/xxe-parser-helper/)             | 3 cross-function         | CWE-611          | A builder across two methods
[ssrf-crossfile](cases/ssrf-crossfile/)                   | 4 cross-file             | CWE-918          | A call into another class
[regex-guard-unanchored](cases/regex-guard-unanchored/)   | 5 framework or sanitizer | CWE-918          | Judging a regex application

Measured detection results are in [docs/matrix.md](../../docs/matrix.md).

## What this sample confirms

Three of ten expected findings are detected, and every one of them is reachable by matching a shape rather than following a value:

- `Cipher.getInstance("DES/ECB/PKCS5Padding")`, a named broken algorithm
- `statement.executeQuery(sql)`, a non-literal reaching a SQL sink
- `DocumentBuilderFactory.newInstance()` without the hardening calls, an absence

Everything requiring a value to be followed across a method or a file is missed.

The sample exists to make three claims replicate rather than rest on one measurement:

**The cross-file SSRF wall holds in Java.**
The identical CWE-918 flow is now planted in PHP, TypeScript and Java, and missed in all three.
Java has the strongest free tooling here, so the wall is a property of the analysis, not of the ecosystem.

**Hardcoded secrets without a vendor prefix are missed in a third language.**
`SIGNING_KEY = "reporting-signing-key-2024"` goes unreported, as `DATABASE_PASSWORD` does in Python and `JWT_SIGNING_SECRET` does in TypeScript.

**SQL injection is reported at the sink, not at the mistake.**
Exactly as in the Python sample, the tool flags `executeQuery(sql)` and not the concatenation on the line above.
The report says "this call is unsafe" while the fix belongs on the previous line.

## The level 3 exception

`xxe-parser-helper` is detected at the factory, which the other level 3 cases in this bench are not.

The reason is worth understanding.
Every other level 3 case asks the tool to follow a value across a method boundary.
This one is an **absence**: the factory is missing calls that should be present, which a purely syntactic rule can see without any dataflow.

The second expectation, `untrusted-parse`, is the genuine level 3 half, and it is missed.

That distinction matters when reading any tool comparison.
"Detects XXE" can mean recognising an unhardened factory anywhere in the codebase, including one that only ever parses trusted input, which is a different and much weaker capability than knowing untrusted XML reaches a parser.

## Layout

```text
src/main/java/com/example/reporting/
  ReportController.java     # Spring handlers, the taint sources
  CryptoService.java        # DES in ECB mode, hardcoded key
  ReportRepository.java     # SQL injection through concatenation
  XmlIngestService.java     # XXE, factory configured in a helper
  UpstreamClient.java       # SSRF sink, and the unanchored regex guard
  safe/                     # correct counterpart of every class above
cases/                      # case manifests and their documentation
```

Anything reported inside `safe/` is a false positive.

## Scanning

From the repository root:

```bash
task scan:sample SAMPLE=java-spring
task score
```

`p/spring` is deliberately absent from the community pack list in `sample.yaml`.
The registry returns 404 for it, exactly as it does for `p/express`, and a single unresolvable pack makes Semgrep abort the whole scan.

## Building

The sample is not wired to a build.
Semgrep parses Java from source without compiling, so no toolchain is needed to reproduce the results.

A build becomes necessary only for tools that analyse bytecode, such as SpotBugs with find-sec-bugs, which is on the backlog.
