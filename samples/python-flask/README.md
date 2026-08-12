# python-flask

A Flask reporting service carrying five cases, one at each level of the difficulty ladder.

The routes in `src/app.py` are the taint sources.
The defects live in the modules those routes call, so the flows are genuinely cross-file rather than contained in a single handler.

This sample exists to give the bench a contrast to `php-symfony`.
Python has the strongest free tool coverage of any language here, so a miss on this sample cannot be blamed on an unsupported ecosystem.

## Cases

Case                                                          | Difficulty                 | CWE     | Requires
--------------------------------------------------------------|----------------------------|---------|-----------------------------
[hardcoded-credential](cases/hardcoded-credential/)           | 1 syntax                   | CWE-798 | Nothing, a literal
[sql-injection-fstring](cases/sql-injection-fstring/)         | 2 intra-procedural         | CWE-89  | Dataflow inside one function
[command-injection-helper](cases/command-injection-helper/)   | 3 cross-function           | CWE-78  | A return value across a call
[path-traversal-crossfile](cases/path-traversal-crossfile/)   | 4 cross-file               | CWE-22  | A call into another module
[sanitizer-bypass-traversal](cases/sanitizer-bypass-traversal/) | 5 framework or sanitizer | CWE-22  | Judging a guard inadequate

Measured detection results are in [docs/matrix.md](../../docs/matrix.md).

## What the ladder shows

The result on this sample is the clearest demonstration of the ladder in the repository.
Semgrep community rules detect levels 1 and 2, half of level 3, and nothing at levels 4 or 5.

Detection tracks the analysis capability required, not the severity of the bug.
The two undetected cases are a path traversal and a traversal guard that does not hold, both of which are more dangerous than the hardcoded token that every tool reports.

Level 3 splits in a revealing way.
`subprocess.run(..., shell=True)` is reported, because `shell=True` is a syntactic pattern.
The f-string that actually builds the attacker controlled command in the helper above it is not, because connecting the two requires following a return value.
A tool can therefore appear to detect command injection while having no idea where the command came from.

## Layout

```text
src/
  app.py       # Flask routes, the taint sources
  config.py    # hardcoded credentials
  db.py        # SQL injection sink
  shell.py     # command injection, split across two functions
  files.py     # path traversal, and the inadequate traversal guard
  safe/        # correct counterpart of every module above
cases/         # case manifests and their documentation
```

`src/safe/` mirrors each vulnerable module: same libraries, same call shapes, same names.
Anything reported inside it is a false positive.

## Scanning

From the repository root:

```bash
task scan:sample SAMPLE=python-flask
task score
```

Bandit is configured for this sample but is not currently installed, so it has no column.
Install it with `pipx install bandit` to add one.

## Running the app

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/python src/app.py
```

The safe routes need the environment populated, since `src/safe/config.py` reads credentials rather than embedding them:

```bash
export REPORTING_DB_PASSWORD=changeme REPORTING_API_TOKEN=changeme
```

## Endpoints

```bash
curl "http://localhost:8000/reports?owner=alice"                    # SQL injection sink
curl "http://localhost:8000/reports/raw?name=../../etc/passwd"      # path traversal
curl "http://localhost:8000/reports/guarded?name=....//....//etc/passwd"   # defeats the guard
curl "http://localhost:8000/reports/convert?name=x;id"              # command injection
```

The guarded endpoint is the interesting one.
`../../etc/passwd` is stripped and fails, while `....//....//etc/passwd` survives the replacement and resolves to the same path.
