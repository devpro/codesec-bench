# ssrf-crossfile

**CWE-918, difficulty 4, cross-file.**

The same defect as in [php-symfony](../../../php-symfony/cases/ssrf-crossfile/), [typescript-express](../../../typescript-express/cases/ssrf-crossfile/) and [java-spring](../../../java-spring/cases/ssrf-crossfile/), planted a fourth time.

## The defect

```csharp
// ReportController.cs:39
public async Task<string> Upstream([FromQuery] string url)
{
    return await _upstreamClient.FetchAsync(url);
}

// UpstreamClient.cs:22
using HttpResponseMessage response = await _httpClient.GetAsync(target);
```

An attacker chooses the host.
Pointing it at `http://169.254.169.254/` returns cloud instance credentials from inside the network boundary.

## The four language result

Ecosystem          | Free tool maturity | ssrf-source | ssrf-sink
-------------------|--------------------|-------------|----------
php-symfony        | Weak               | no          | no
typescript-express | Strong             | no          | no
java-spring        | Strongest          | no          | no
dotnet-aspnet      | Strong             | no          | no

Eight expectations, four ecosystems, one framework each, zero detections.

The first miss was arguable.
Four independent measurements spanning the full range of free tool maturity are not.

**Cross-file taint tracking is the boundary between the free and the commercial tier.**
No amount of rule writing crosses it, because the rules are not the limitation: the analysis does not follow values across file boundaries at all.

This is the single most reproducible result in the repository, and it is the one worth quoting to anyone deciding whether free SAST is sufficient.

## The safe counterpart

`src/Safe/SafeUpstreamClient.cs` parses the URL with `Uri.TryCreate` and compares `uri.Host` for equality against an allowlist, also requiring https.
`src/Safe/SafeReportController.cs` binds the same parameters in the same way.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
