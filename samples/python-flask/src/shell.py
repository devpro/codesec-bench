"""Report conversion, which shells out to an external converter.

Intentionally vulnerable, see cases/command-injection-helper.
"""

import subprocess

CONVERTER = "/usr/local/bin/report-convert"


def _build_command(report_name, output_format):
    """Assemble the converter invocation.

    This helper is where the untrusted value is joined into the command string.
    The sink is in the caller, so seeing the defect means following the return value across two functions.
    """
    return f"{CONVERTER} --format {output_format} --input {report_name}"


def convert_report(report_name, output_format="pdf"):
    command = _build_command(report_name, output_format)

    # VULN: shell=True on a string built from user input, so a semicolon starts a second command.
    result = subprocess.run(command, shell=True, capture_output=True, text=True)

    return result.stdout
