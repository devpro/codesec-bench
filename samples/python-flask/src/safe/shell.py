"""Correct counterpart of src/shell.py.

Same converter, same helper split across two functions, same subprocess call.
The command is a list and the shell is not involved, so no metacharacter is interpreted.

Any finding reported in this file is a false positive.
"""

import subprocess

CONVERTER = "/usr/local/bin/report-convert"

ALLOWED_FORMATS = ("pdf", "csv", "html")


def _build_command(report_name, output_format):
    return [CONVERTER, "--format", output_format, "--input", report_name]


def convert_report(report_name, output_format="pdf"):
    if output_format not in ALLOWED_FORMATS:
        raise ValueError("Unsupported output format")

    command = _build_command(report_name, output_format)

    result = subprocess.run(command, shell=False, capture_output=True, text=True)

    return result.stdout
