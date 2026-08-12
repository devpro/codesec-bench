"""Flask entry point for the reporting service.

Every route here is a taint source.
The defects live in the modules the routes call, which is what makes the flows cross-file.
"""

from flask import Flask, jsonify, request

import db
import files
import shell

app = Flask(__name__)


@app.route("/")
def home():
    return jsonify(
        {
            "app": "codesec-bench / python-flask",
            "description": "Intentionally vulnerable Flask app for SAST measurement",
        }
    )


@app.route("/reports")
def list_reports():
    owner = request.args.get("owner", "")

    return jsonify({"reports": db.find_reports_by_owner(owner)})


@app.route("/reports/raw")
def read_raw_report():
    name = request.args.get("name", "")

    return files.read_report(name)


@app.route("/reports/guarded")
def read_guarded_report():
    name = request.args.get("name", "")

    return files.read_report_guarded(name)


@app.route("/reports/convert")
def convert_report():
    name = request.args.get("name", "")
    output_format = request.args.get("format", "pdf")

    return shell.convert_report(name, output_format)


if __name__ == "__main__":
    app.run(port=8000)
