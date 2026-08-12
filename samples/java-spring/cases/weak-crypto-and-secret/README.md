# weak-crypto-and-secret

**CWE-327 and CWE-798, difficulty 1, pure syntax.**

## The defect

```java
// CryptoService.java:17
private static final String SIGNING_KEY = "reporting-signing-key-2024";

// CryptoService.java:29
Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
```

DES has a 56 bit effective key and is exhaustively searchable on commodity hardware.
ECB mode additionally leaks structure, because identical plaintext blocks produce identical ciphertext blocks.
The key being a literal means anyone with repository access can decrypt everything the service has produced.

## What measuring it revealed

The cipher is detected, by two separate rules: one for DES, one for ECB.

The key is not.

This is the third language in which the same thing happens.
`DATABASE_PASSWORD` is missed in the Python sample, `JWT_SIGNING_SECRET` is missed in the TypeScript sample, and `SIGNING_KEY` is missed here.
In Python, a token with an `sk_live_` prefix on the adjacent line was reported twice.

Three languages, three rule sets, one behaviour: secret detection recognises **vendor credential formats**, it does not reason about what a variable holds.

A hardcoded credential is the most commonly cited example of what SAST catches.
It is worth knowing that the catch depends on the credential looking like someone's API token, and that a plain application secret in a variable named key or password goes unreported at the easiest level of the ladder.

## The safe counterpart

`safe/SafeCryptoService.java` injects the key from configuration with `@Value` and uses authenticated AES-GCM with a random nonce.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
