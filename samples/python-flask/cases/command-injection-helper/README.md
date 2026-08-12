# command-injection-helper

**CWE-78, difficulty 3, cross-function within one file.**

## The defect

```python
# src/shell.py:17, inside _build_command()
return f"{CONVERTER} --format {output_format} --input {report_name}"

# src/shell.py:24, inside convert_report()
result = subprocess.run(command, shell=True, capture_output=True, text=True)
```

`report_name` comes from `?name=` on `/reports/convert`.
A value of `x;id` runs `id` as a second command.

## Why it is level 3

The dangerous string is built in a private helper and consumed by its caller.
Both are in the same file, so no cross-module resolution is needed, but connecting them still requires following a return value across a call boundary.

## What measuring it revealed

This case splits, and the split is the most instructive result in the sample.

`subprocess.run(..., shell=True)` is detected. `shell=True` on a non-literal is a syntactic pattern that rule packs match on sight, with no knowledge of where `command` came from.

The f-string in `_build_command` is not detected. Nothing about that line is dangerous in isolation, and flagging it requires knowing its return value reaches a shell.

So a tool can report command injection on this file while having no idea the input is attacker controlled.
The same rule would fire on `subprocess.run(command, shell=True)` where `command` is a hardcoded constant, which is why detecting the sink alone does not demonstrate dataflow analysis.

## The safe counterpart

`src/safe/shell.py` keeps the same two function split and passes a list with `shell=False`, so no metacharacter is interpreted.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
