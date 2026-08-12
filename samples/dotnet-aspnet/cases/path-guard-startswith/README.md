# path-guard-startswith

**CWE-22, difficulty 5, sanitizer reasoning.**

This case produced the most instructive result in the repository.

## The defect

```csharp
// ReportFileService.cs:22
string fullPath = Path.GetFullPath(Path.Combine(ReportsDirectory, name));

// ReportFileService.cs:25
if (!fullPath.StartsWith(ReportsDirectory))
{
    throw new UnauthorizedAccessException("Report name escapes the reports directory");
}
```

`ReportsDirectory` is `/var/lib/reports`, with no trailing separator.

A sibling directory whose name merely begins with the same characters satisfies the prefix:

```text
/var/lib/reports-public/secrets.txt   accepted, and outside the intended directory
/var/lib/reports/../../etc/passwd     rejected, because GetFullPath normalised it first
```

The resolution step is genuinely correct, and that is what makes the guard convincing.
`Path.GetFullPath` really does normalise traversal sequences away, so the obvious payload is rejected and the check looks tested.
The mistake is in the comparison, not in the normalisation.

## The result, and why it is not what it looks like

`guarded-read` is recorded as **detected**.
It is the only level 5 expectation detected anywhere in this bench.

It is not a detection in any meaningful sense.

The rule that fires is `unsafe-path-combine`, and it fires in exactly two places:

Location                              | Guarded correctly | Reported
--------------------------------------|-------------------|---------
`src/ReportFileService.cs:30`         | no                | yes
`src/Safe/SafeReportFileService.cs:26` | yes              | yes

The rule flags path operations indiscriminately.
It reports the broken guard and the correct guard with equal confidence, because it is not reading the guard at all.

**Without the safe counterpart, this would have been published as the first level 5 detection in the repository.**
The counterpart is the only thing separating "the tool found the bug" from "the tool flags every file read".

The bench still records it as detected, because the scoring rule is that outcomes are measured rather than intent, and the tool did report the vulnerable line.
The false positive column is what carries the correction, and this is precisely why both columns exist.

`prefix-containment-check`, the expectation that would require actually reading the comparison, is missed.

## The pattern across all four level 5 cases

Every level 5 case in this bench is the same mistake wearing different clothes:

Sample             | Broken guard                              | The fix
-------------------|-------------------------------------------|----------------------------------
python-flask       | `name.replace("../", "")`                  | `os.path.realpath` then containment
typescript-express | `target.startsWith("https://reports.internal")` | `new URL(target).hostname`
java-spring        | `ALLOWED.matcher(target).find()`           | `URI.create(target).getHost()`
dotnet-aspnet      | `fullPath.StartsWith(ReportsDirectory)`    | append the separator, then compare

Three of the four reason about **the shape of a string**.
The fourth, this one, resolves correctly and then compares carelessly.

The general rule holds across all of them: **parse the value into the thing it will actually become, then decide on that.**
A parsed hostname cannot be extended. A resolved path with a terminated prefix cannot be a sibling.

None of the four is detected by reasoning.

## The safe counterpart

`src/Safe/SafeReportFileService.cs` appends `Path.DirectorySeparatorChar` to the resolved base directory before comparing, and passes `StringComparison.Ordinal`.

The fix is one character of data plus an explicit comparison mode.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
