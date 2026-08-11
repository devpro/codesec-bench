# broad-exception-catch

**CWE-396, difficulty 1, pure syntax.**

## The defect

```php
// src/Service/ApiClient.php:54
} catch (\Throwable $e) {
```

`Throwable` covers `Error` as well as `Exception`, so a type error, an out of memory condition or a failed assertion inside the try block is reported to the caller as an upstream API failure.
The real fault is swallowed and the wrong system gets blamed.

## Why it is level 1

One syntactic construct, no dataflow, no call graph, no framework knowledge.
This is the control case of the sample: a tool that misses it is not analysing PHP meaningfully, and its zero on the harder cases carries no information.

## What measuring it revealed

The rule written for this case never fired.
Semgrep OSS 1.104.0 cannot match PHP try/catch structurally at all, including a bare `try { ... }` pattern, so the structural rule silently returned nothing while the documentation claimed a detection.

Only `pattern-regex` works.
The full measurement is in [docs/tool-notes.md](../../../../docs/tool-notes.md).

This is the clearest argument for the whole design of this repository.
A level 1 defect went undetected by a rule written specifically for it, and a hand maintained table recorded it as found.

## The safe counterpart

`src/Safe/SafeApiClient.php` catches `TransportExceptionInterface`, the narrowest type covering the failure being handled.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
