# CodeSec Bench

A workbench for evaluating code security tools — intentionally vulnerable samples, scan results, and findings across SAST, SCA, and beyond.

Each sample is self-contained, runnable, and annotated with the expected findings.

## Adding a new language sample

1. Create `<language>-<framework>/` as a sibling of `php-symfony/`.
2. Add a minimal runnable project + tests.
3. Add a `README.md` in the subdirectory listing expected findings with CWE refs.
4. Update `.github/workflows/` and this root README.
