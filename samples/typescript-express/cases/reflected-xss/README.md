# reflected-xss

**CWE-79, difficulty 2, intra-procedural.**

## The defect

```typescript
// src/render.ts:15
const heading = `<h1>Results for ${term}</h1>`;
```

`term` arrives from `?term=` on `/search` and is interpolated into the markup unescaped, then returned as the response body.
A term of `<script>fetch('/admin/keys')...</script>` executes in the visitor's session.

## Why it is level 2

The interpolation and the return are inside one function.
Following `term` into `heading` and out through the return value needs no call graph.

## What measuring it revealed

Not detected, which is the most surprising result in the repository.

Reflected XSS is the textbook web vulnerability, in the language with the best free tool coverage, at the second easiest level of the ladder.

The likely reason is the template literal.
String concatenation into HTML is a heavily covered pattern, because `+` is an operator a rule can match on.
Template interpolation is syntax, and `${...}` inside a template appears not to be reached by the rules that cover the concatenation form.

That distinction is invisible to a developer.
The two spellings are equivalent, idiomatic TypeScript prefers the template literal, and choosing the idiomatic one loses the detection.

A rule did fire for XSS on this sample, but on `src/safe/app.ts`, the correct counterpart.
See the sample README.

## The safe counterpart

`src/safe/render.ts` uses the same template literals and the same markup, escaping every interpolated value first.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
