"""Correct counterpart of src/files.py.

Same join, same open, same names.
Containment is checked on the resolved path, which no traversal sequence can defeat because it is decided after normalisation rather than by rewriting the input.

Any finding reported in this file is a false positive.
"""

import os

from safe.config import REPORTS_DIR


def _resolve_within(base, name):
    """Resolve a name under a base directory, or refuse."""
    base_real = os.path.realpath(base)
    candidate = os.path.realpath(os.path.join(base_real, name))

    if candidate != base_real and not candidate.startswith(base_real + os.sep):
        raise ValueError("Report name escapes the reports directory")

    return candidate


def read_report(name):
    path = _resolve_within(REPORTS_DIR, name)

    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def read_report_guarded(name):
    path = _resolve_within(REPORTS_DIR, name)

    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()
