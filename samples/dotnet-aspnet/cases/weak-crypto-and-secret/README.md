# weak-crypto-and-secret

**CWE-327 and CWE-798, difficulty 1, pure syntax.**

## The defect

```csharp
// CryptoService.cs:15
private const string ConnectionString =
    "Server=reporting-db.internal;Database=reports;User Id=reporting_app;Password=Pr0d-Reporting-2024;";

// CryptoService.cs:28
using var md5 = MD5.Create();
```

MD5 is collision broken, so two different payloads can be made to share a fingerprint, which defeats the integrity check this value is used for.
The connection string embeds a plaintext production database password in source.

## What measuring it revealed

**Both are missed.**

This is the only sample in the bench where nothing at level 1 is detected, and both misses are surprising for different reasons.

`MD5.Create()` goes unreported here, while the equivalent is reported in other languages:

Sample             | Weak algorithm call            | Detected
-------------------|--------------------------------|---------
typescript-express | `createHash("md5")`            | yes
java-spring        | `Cipher.getInstance("DES/ECB")` | yes, twice
dotnet-aspnet      | `MD5.Create()`                 | no

The same defect class, at the same ladder level, in three languages, with inconsistent coverage.
Rule packs are not uniform across ecosystems, and a tool comparison run in one language does not transfer to another.

The connection string is the more striking miss.
Every other hardcoded secret in this bench is a bare literal in a named variable, which at least requires inferring meaning from the name.
This one carries the keyword `Password=` inside the value itself, which is the most recognisable credential shape there is, and it is still not reported.

That makes four languages in which a hardcoded secret goes unreported at the easiest level of the ladder.

## The safe counterpart

`src/Safe/SafeCryptoService.cs` reads the connection string through `IConfiguration` and uses SHA-256.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
