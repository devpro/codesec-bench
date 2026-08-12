# prototype-pollution-merge

**CWE-1321, difficulty 3, cross-function within one file.**

## The defect

```typescript
// src/merge.ts:24
target[key] = deepMerge((target[key] as Preferences) ?? {}, value as Preferences);
```

`deepMerge` copies every own key of the source onto the target, recursing into nested objects.
Nothing excludes `__proto__`, so a request body of `{"__proto__": {"isAdmin": true}}` walks into the prototype of the target and assigns there.

Every object in the process then inherits `isAdmin`, which turns a preferences endpoint into privilege escalation across the whole application.

## Why it is level 3

The dangerous assignment happens on a recursive call, not on the key the handler passed in.
Both are in the same file, so no cross-module resolution is needed, but connecting them requires following the recursion.

## What measuring it revealed

Not detected.

Prototype pollution is a JavaScript native class of bug with well known rules, and a recursive merge without a key check is its canonical shape.
The miss is consistent with the rest of the sample: anything requiring the analysis to follow a value across a call boundary is out of reach here.

## The safe counterpart

`src/safe/merge.ts` keeps the same recursion and the same signature, excluding `__proto__`, `constructor` and `prototype`, and building the target with a null prototype so there is nothing to pollute.

Excluding the keys alone would be enough.
Both are done because that is what correct code in this position looks like.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
