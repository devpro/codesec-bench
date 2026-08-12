# ssrf-crossfile

**CWE-918, difficulty 4, cross-file.**

This case is deliberately the same defect as [php-symfony/ssrf-crossfile](../../../php-symfony/cases/ssrf-crossfile/), in a different ecosystem.

## The defect

```typescript
// src/app.ts:31
const target = String(request.query.url ?? "");
response.send(await fetchReport(target));

// src/fetcher.ts:17
const response = await fetch(target, { headers: { accept: "application/json" } });
```

An attacker chooses the host.
Pointing it at `http://169.254.169.254/` returns cloud instance credentials from inside the network boundary, which is the whole reason SSRF is rated as highly as it is.

## Why it is level 4

The source is an Express request object in one module and the sink is a `fetch` call in another.
Detecting it requires modelling the framework as a taint source and following the call across a module boundary.

## Why this case exists twice

The PHP sample misses the same flow, and PHP has genuinely weak free tool support, so that miss could be blamed on the ecosystem rather than on the analysis.

Planting the identical CWE in TypeScript removes that explanation.
TypeScript has the best free tool coverage in this repository, and the flow is missed here too, at both the source and the sink.

**Level 4 is where free tooling stops, and it is not an ecosystem problem.**
That statement now rests on two independent measurements rather than one.

## The safe counterpart

`src/safe/fetcher.ts` parses the URL and compares the hostname for equality against an allowlist.
`src/safe/app.ts` exposes the same handlers reading the same query parameters.

The counterpart earns its place here: an XSS rule fires on `src/safe/app.ts:35`, a handler that calls the correctly guarded fetcher, and is recorded as a false positive.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
