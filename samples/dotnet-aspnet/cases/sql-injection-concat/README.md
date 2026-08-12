# sql-injection-concat

**CWE-89, difficulty 2, intra-procedural.**

## The defect

```csharp
// ReportRepository.cs:29
string sql = "SELECT title FROM reports WHERE owner = '" + owner + "'";
await using var command = new SqlCommand(sql, connection);
```

`owner` arrives from `?owner=` on `/reports`.
A quote ends the literal and everything after it executes as SQL.

## What measuring it revealed

The tool reports line 30, the `SqlCommand` construction.
It does not report line 29, the concatenation that creates the injection.

This is now the third language showing the same behaviour:

Sample        | Reported                    | Not reported
--------------|-----------------------------|---------------------------
python-flask  | `cursor.execute(query)`     | the f-string above it
java-spring   | `statement.executeQuery(sql)` | the concatenation above it
dotnet-aspnet | `new SqlCommand(sql, ...)`  | the concatenation above it

Three ecosystems, three rule packs, one pattern: **the finding lands on the sink, and the fix belongs on the line that was not flagged.**

It also means these are sink rules rather than taint rules.
They fire because a non-literal reaches a SQL API, and would fire identically on a query assembled from entirely trusted constants.
Detecting this does not demonstrate that a tool knows the value is attacker controlled.

## The safe counterpart

`src/Safe/SafeReportRepository.cs` runs the same query with the owner bound through `command.Parameters`.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
