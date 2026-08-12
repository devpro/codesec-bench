# weak-hash-and-secret

**CWE-327 and CWE-798, difficulty 1, pure syntax.**

## The defect

```typescript
// src/crypto.ts:10
export const JWT_SIGNING_SECRET = "s3cr3t-jwt-signing-key-do-not-share";

// src/crypto.ts:20
return createHash("md5").update(password).digest("hex");
```

MD5 is fast and used here unsalted, so a commodity GPU covers the plausible keyspace of human chosen passwords in hours, and identical passwords produce identical digests.
The signing key being a literal means anyone with repository access can mint valid tokens.

## Why it is level 1

Two single expressions.
No dataflow, no call graph, no framework knowledge.
This is the calibration case for the sample.

## What measuring it revealed

The two expectations are deliberately separate, because they are not equally detectable.

`createHash("md5")` is detected.
A named weak algorithm in a single call is the most heavily covered pattern in any rule pack.

`JWT_SIGNING_SECRET` is not detected, despite being an obvious plaintext signing key in a variable named secret.

This replicates the Python sample exactly, where `DATABASE_PASSWORD` is missed while an API token with an `sk_live_` prefix on the next line is reported twice.
Two languages, two rule sets, the same behaviour: secret detection recognises vendor credential formats, it does not reason about what a variable holds.

A hardcoded credential is the single most commonly cited SAST win.
It is worth knowing that the win depends on the credential resembling a vendor's token format.

## The safe counterpart

`src/safe/crypto.ts` reads the secret from the environment and derives the hash with salted scrypt, keeping the same exports and call shapes.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
