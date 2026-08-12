# hardcoded-credential

**CWE-798, difficulty 1, pure syntax.**

## The defect

```python
# src/config.py:8
DATABASE_PASSWORD = "pr0d-Reporting-2024!"
SERVICE_API_TOKEN = "sk_live_9f2a4c8e1b7d3f6a0c5e8b2d4f7a1c9e"
```

Both are in every clone and in the history forever.
Rotation requires a code change and a deployment, so in practice they never rotate.

## Why it is level 1

A literal in an assignment.
No dataflow, no call graph, no framework knowledge.
This is the calibration case: a tool that misses it entirely finds nothing at all, so its zero on the harder cases carries no information.

## What measuring it revealed

The two lines are not equally detectable, which is why they are separate expectations.

`SERVICE_API_TOKEN` is found, because `sk_live_` is a recognisable provider prefix and secret scanning rules key on it.
`DATABASE_PASSWORD` is not found, despite being an obvious plaintext production password in a variable literally named password.

Detection here is pattern recognition on the value, not reasoning about the variable.
A credential that does not look like a known vendor's token format goes unreported at the easiest level of the ladder.

## The safe counterpart

`src/safe/config.py` keeps the same names and reads both values from the environment.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
