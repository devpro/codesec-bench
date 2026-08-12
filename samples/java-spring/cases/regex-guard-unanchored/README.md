# regex-guard-unanchored

**CWE-918, difficulty 5, sanitizer reasoning.**

## The defect

```java
// UpstreamClient.java:20
private static final Pattern ALLOWED = Pattern.compile("https://reports\\.internal");

// UpstreamClient.java:48
if (!ALLOWED.matcher(target).find()) {
    throw new IllegalArgumentException("Upstream host is not allowed");
}
```

Two independent mistakes compound:

- `find()` searches for the pattern **anywhere** in the input. `matches()` would require it to cover the whole input.
- The pattern carries no anchors, so even `matches()` semantics were never expressed.

Any URL containing the allowed host as a substring passes:

```text
https://evil.com/?next=https://reports.internal   accepted, fetched
https://evil.com/                                 refused
```

The refusal of the obvious payload is what makes this dangerous.
The guard demonstrably rejects something, so it looks tested and correct.

## Why it is level 5

The tool must judge **how the pattern is applied**, not whether validation exists.

`find` versus `matches` is a two character difference that completely changes the meaning, and the surrounding code is otherwise exemplary: a compiled constant `Pattern`, a properly escaped dot, a thrown exception on failure. Everything about it reads as careful.

## What measuring it revealed

Not detected, at either expectation.

This is the same outcome as the TypeScript `ssrf-allowlist-bypass` case, which uses `startsWith` instead of a regex.
Two different spellings of "check the URL against the allowed host", both wrong in the same way, both unreported.

## The pattern worth internalising

Every level 5 case in this bench has the same shape, and so does its fix.

The broken version reasons about **the shape of the input string**: does it start with the right thing, does it contain the right thing, does it not contain the wrong thing.

The correct version **parses the input into the thing it will actually become**, then decides on that:

```java
URI uri = URI.create(target);
if (!ALLOWED_HOSTS.contains(uri.getHost())) throw ...;
```

`uri.getHost()` cannot be extended or padded, because the parser has already decided where the authority ends.
The same reasoning applies to the Python traversal case, where `realpath` replaces stripping `../` from a string.

**String inspection guesses at what a value will mean. Parsing determines it.**

## The safe counterpart

`safe/SafeUpstreamClient.java`, which parses and compares the host for equality, and also rejects any scheme other than https.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
