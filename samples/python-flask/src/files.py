"""Report file access.

Intentionally vulnerable, see cases/path-traversal-crossfile and cases/sanitizer-bypass-traversal.
"""

import os

from config import REPORTS_DIR


def _strip_traversal(name):
    """Remove parent directory sequences from a report name.

    This looks like a sanitizer and is not one.
    The replacement runs once over the string, so a sequence that reappears after its own removal survives it: "....//" loses the inner "../" and becomes "../".
    """
    return name.replace("../", "")


def read_report(name):
    """Read a report by name, with no validation at all."""
    # VULN: the name comes straight from the request, so "../../etc/passwd" escapes the directory.
    path = os.path.join(REPORTS_DIR, name)

    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def read_report_guarded(name):
    """Read a report by name, behind a guard that does not hold.

    The guard is what makes this hard: a tool has to decide that _strip_traversal is not an effective sanitizer rather than treat any transformation as one.
    """
    safe_name = _strip_traversal(name)

    # VULN: safe_name still escapes the directory when the input was "....//....//etc/passwd".
    path = os.path.join(REPORTS_DIR, safe_name)

    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()
