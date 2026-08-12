# typescript-express

An Express reporting service in TypeScript, carrying five cases, one at each level of the difficulty ladder.

The handlers in `src/app.ts` are the taint sources.
The defects live in the modules those handlers call, so the flows are genuinely cross-file.

This sample exists to answer one question the other two leave open.
`php-symfony` misses its cross-file SSRF, and PHP has weak tool support, so the miss could plausibly be blamed on the ecosystem.
This sample plants **the same CWE-918 defect** in TypeScript, which has strong support, and it is missed there too.

## Cases

Case                                                            | Difficulty                 | CWE              | Requires
----------------------------------------------------------------|----------------------------|------------------|-----------------------------
[weak-hash-and-secret](cases/weak-hash-and-secret/)             | 1 syntax                   | CWE-327, CWE-798 | Nothing, single expressions
[reflected-xss](cases/reflected-xss/)                           | 2 intra-procedural         | CWE-79           | Dataflow inside one function
[prototype-pollution-merge](cases/prototype-pollution-merge/)   | 3 cross-function           | CWE-1321         | A recursive call
[ssrf-crossfile](cases/ssrf-crossfile/)                         | 4 cross-file               | CWE-918          | A call into another module
[ssrf-allowlist-bypass](cases/ssrf-allowlist-bypass/)           | 5 framework or sanitizer   | CWE-918          | Judging a guard inadequate

Measured detection results are in [docs/matrix.md](../../docs/matrix.md).

## What this sample shows

One of eight expected findings is detected: the MD5 call.

That is the weakest result in the repository, in the best supported language, which is worth sitting with.
Two conclusions replicate across samples rather than resting on a single measurement:

**The cross-file SSRF wall is not a PHP problem.**
The same CWE-918 flow is missed in PHP and in TypeScript.
Level 4 is where free tooling stops, regardless of ecosystem.

**Secret detection keys on vendor prefixes, not on variables.**
`JWT_SIGNING_SECRET = "s3cr3t-jwt-signing-key-do-not-share"` is not reported here, exactly as `DATABASE_PASSWORD` is not reported in the Python sample.
In both cases a token with a recognisable vendor prefix on a nearby line *is* reported.

The level 2 miss is also notable.
Reflected XSS through a template literal is not detected, although the equivalent string concatenation is a heavily covered pattern.
Template interpolation is syntax rather than an operator, which appears to put it out of reach of the rules that cover the concatenation form.

## The false positive

The XSS rule `direct-response-write` fires on `src/safe/app.ts:35`, which calls the correctly guarded fetcher.
The rule reacts to a handler writing a value derived from user input into a response, without regard for what happened to that value in between.

This is the clearest illustration of why every case ships a counterpart.
The same rule that produces this false positive contributes nothing to the eight expected findings.

## Layout

```text
src/
  app.ts       # Express handlers, the taint sources
  crypto.ts    # MD5 password hashing and a hardcoded JWT secret
  render.ts    # reflected XSS through a template literal
  merge.ts     # prototype pollution in a recursive merge
  fetcher.ts   # SSRF sink, and the startsWith allowlist that does not hold
  safe/        # correct counterpart of every module above
cases/         # case manifests and their documentation
```

Anything reported inside `src/safe/` is a false positive.

## Scanning

From the repository root:

```bash
task scan:sample SAMPLE=typescript-express
task score
```

Note that `p/express` is deliberately absent from the community pack list in `sample.yaml`.
The registry returns 404 for it, and a single unresolvable pack makes Semgrep abort the whole scan while still writing a valid, empty SARIF.
See [docs/tool-notes.md](../../docs/tool-notes.md).

## Building and running

```bash
npm install
npm run build
npm start
```

## Endpoints

```bash
curl "http://localhost:8000/search?term=<script>alert(1)</script>"        # reflected XSS
curl "http://localhost:8000/upstream?url=http://169.254.169.254/"         # SSRF
curl "http://localhost:8000/upstream/guarded?url=https://reports.internal.evil.com/"   # defeats the allowlist
curl -X POST http://localhost:8000/preferences -H 'content-type: application/json' \
  -d '{"__proto__": {"isAdmin": true}}'                                   # prototype pollution
```

The guarded upstream endpoint is the interesting one.
`https://evil.com/` is refused, while `https://reports.internal.evil.com/` passes, because `startsWith` never checks where the authority ends.
