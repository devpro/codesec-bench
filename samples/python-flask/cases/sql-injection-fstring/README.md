# sql-injection-fstring

**CWE-89, difficulty 2, intra-procedural.**

## The defect

```python
# src/db.py:24
query = f"SELECT id, title, owner FROM reports WHERE owner = '{owner}'"
cursor.execute(query)
```

`owner` arrives from `?owner=` on `/reports`.
A single quote ends the literal and everything after it executes as SQL.

## Why it is level 2

The parameter, the string construction and the execution are all inside one function.
Following `query` from line 24 to line 25 needs no call graph.

## What measuring it revealed

The two expectations are deliberately one line apart, and tools do not treat them the same.

Semgrep reports the `cursor.execute(query)` call, not the f-string that built the injection.
The rule that fires is a sink rule: it sees a non-literal reaching `execute` and flags the call site.

The distinction matters for anyone acting on the finding.
A report pointing at line 25 says "this call is unsafe", while the actual mistake is on line 24, and the fix is to bind a parameter rather than to change the execute call.

These two expectations originally had a tolerance wide enough to overlap, which credited a single finding to both.
That is now rejected at validation time.

## The safe counterpart

`src/safe/db.py` runs the same statement with the owner bound as a parameter.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
