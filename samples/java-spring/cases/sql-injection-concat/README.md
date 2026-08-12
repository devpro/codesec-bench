# sql-injection-concat

**CWE-89, difficulty 2, intra-procedural.**

## The defect

```java
// ReportRepository.java:37
String sql = "SELECT title FROM reports WHERE owner = '" + owner + "'";
ResultSet results = statement.executeQuery(sql);
```

`owner` arrives from `?owner=` on `/reports`.
A quote ends the literal and everything after it executes as SQL.

## What measuring it revealed

The tool reports line 38, the `executeQuery` call.
It does not report line 37, the concatenation that creates the injection.

This is identical to the Python sample, where the `cursor.execute(query)` call is reported and the f-string above it is not.
Two languages, two rule sets, the same behaviour.

The distinction matters for anyone acting on the finding.
The report points at the execution and says "this call is unsafe".
The mistake is on the previous line, and the fix is to bind a parameter, which changes the line that was not flagged.

It also means the rule is a **sink rule**, not a taint rule.
It fires because a non-literal reaches `executeQuery`, and it would fire identically if `sql` had been assembled from entirely trusted constants.
Detecting this does not demonstrate that the tool knows the value is attacker controlled.

## The safe counterpart

`safe/SafeReportRepository.java` runs the same query through a `PreparedStatement` with the owner bound as a parameter.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
