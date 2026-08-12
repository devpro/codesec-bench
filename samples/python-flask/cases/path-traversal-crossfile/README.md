# path-traversal-crossfile

**CWE-22, difficulty 4, cross-file.**

## The defect

```python
# src/app.py:35
name = request.args.get("name", "")
return files.read_report(name)

# src/files.py:23
path = os.path.join(REPORTS_DIR, name)
with open(path, "r", encoding="utf-8") as handle:
```

Nothing validates `name`, so `../../etc/passwd` leaves the reports directory entirely.

## Why it is level 4

The source is a Flask request object in one module and the sink is an `open` call in another.
Detecting it requires modelling the framework as a taint source and following the call across a module boundary.

## What measuring it revealed

Not detected, at either end.

This is the same wall the PHP SSRF case hits, in the language with the best free tool coverage in the repository.
`os.path.join` with a variable is an extremely common and mostly benign shape, so a rule that flags it unconditionally would be unusable.
Reporting it correctly means knowing the value is attacker controlled, and that is cross-file taint analysis.

The result is worth stating plainly: level 4 is where free tooling stops, and it is not a PHP problem.

## The safe counterpart

`src/safe/files.py` resolves the candidate path and refuses anything that does not stay under the base directory.
`src/safe/app.py` exposes the identical routes reading the identical query parameters, so a tool reacting to the source rather than the sink would be visible as a false positive.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
