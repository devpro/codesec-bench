# sanitizer-bypass-traversal

**CWE-22, difficulty 5, sanitizer reasoning.**

This is the hardest case in the bench.

## The defect

```python
# src/files.py:17
def _strip_traversal(name):
    return name.replace("../", "")

# src/files.py:37
safe_name = _strip_traversal(name)
path = os.path.join(REPORTS_DIR, safe_name)
```

`str.replace` scans the string once and does not revisit what it produced.
So a sequence that reappears *as a result of its own removal* survives:

```text
"....//"  ->  remove the inner "../"  ->  "../"
```

An input of `....//....//etc/passwd` therefore reaches `open()` as `../../etc/passwd`.
The guard runs, appears to work, and changes nothing.

## Why it is level 5

Every earlier case asks a tool to find a flow.
This one asks it to *judge* one.

The taint flows through a function that transforms it, and the tool has to decide whether that transformation makes it safe.
Tools that model sanitizers by name, or that treat any transformation applied to tainted data as cleansing, will mark the flow clean and report nothing.

That failure mode is worse than a plain miss.
A missed flow is a gap; a flow suppressed by a sanitizer model is a silent false negative that the tool is confident about.

## What measuring it revealed

Not detected.

Both expectations are recorded, since either would be a useful result:

- `inadequate-sanitizer` on line 17 names the actual mistake and is the clearest possible finding.
- `guarded-sink` on line 37 would be reported by a tool with no sanitizer model at all, simply because it tracks taint and does not recognise `replace` as cleansing.

The second counts as a detection here even though it would arguably be reached by accident.
The bench measures outcomes, not intent: a tool that reports the vulnerable line has reported the vulnerable line.

## The safe counterpart

`src/safe/files.py` decides containment on the *resolved* path:

```python
candidate = os.path.realpath(os.path.join(base_real, name))
if candidate != base_real and not candidate.startswith(base_real + os.sep):
    raise ValueError(...)
```

This is the structural difference worth internalising.
The broken version rewrites the input and hopes the rewrite is exhaustive.
The correct version normalises first and then checks where the result actually points, which no traversal encoding can defeat.

## Measured results

See [docs/matrix.md](../../../../docs/matrix.md).
