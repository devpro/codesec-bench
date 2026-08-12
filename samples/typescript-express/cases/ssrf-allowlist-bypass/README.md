# ssrf-allowlist-bypass

**CWE-918, difficulty 5, sanitizer reasoning.**

## The defect

```typescript
// src/fetcher.ts:30
if (!target.startsWith(ALLOWED_PREFIX)) {
  throw new Error("Upstream host is not allowed");
}

// src/fetcher.ts:35
const response = await fetch(target, { headers: { accept: "application/json" } });
```

`ALLOWED_PREFIX` is `"https://reports.internal"`.

`startsWith` constrains the beginning of the string and says nothing about where the authority ends, because the prefix is not terminated by a separator.

```text
https://reports.internal.evil.com/   passes, and resolves to a host the attacker registered
https://evil.com/                    refused
```

The guard is present, looks deliberate, and does not hold.

## Why it is level 5

Every earlier case asks a tool to find a flow.
This one asks it to judge one.

A tool that models sanitizers by presence, or that treats any comparison against tainted data as validating, marks the flow clean and reports nothing.
That is worse than a plain miss: it is a silent false negative the tool is confident about.

## What measuring it revealed

Not detected, at either expectation.

Both are recorded because either would be useful:

- `prefix-check-guard` on line 30 names the actual mistake, which is the most actionable possible result.
- `guarded-sink` on line 35 would be reported by a tool that tracks taint and does not treat `startsWith` as validating.

The second counts as a detection here even though it would be reached without reasoning about the guard.
The bench measures outcomes, not intent.

## Why this shape matters

This is the same class of error as the Python `sanitizer-bypass-traversal` case, and the fix has the same structure in both.

The broken version reasons about the **shape of the input string**: does it start with the right thing, does it contain a forbidden sequence.
The correct version **parses the input into the thing it will actually become**, then decides on that.

```typescript
const url = new URL(target);
if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error(...);
```

Comparing `url.hostname` for equality cannot be extended, because the parser has already decided where the authority ends.

## The safe counterpart

`src/safe/fetcher.ts`, as above, also rejecting any protocol other than https.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
