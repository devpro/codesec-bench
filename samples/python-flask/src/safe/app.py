"""Correct counterpart of src/app.py.

The same routes read the same query parameters and call the same function names, in the safe package.
The taint sources are identical, so a tool that flags these routes is reacting to the source rather than to a reachable sink.

Any finding reported in this file is a false positive.
"""

from flask import Flask, jsonify, request

from safe import db, files, shell

app = Flask(__name__)


@app.route("/safe/reports")
def list_reports():
    owner = request.args.get("owner", "")

    return jsonify({"reports": db.find_reports_by_owner(owner)})


@app.route("/safe/reports/raw")
def read_raw_report():
    name = request.args.get("name", "")

    return files.read_report(name)


@app.route("/safe/reports/convert")
def convert_report():
    name = request.args.get("name", "")
    output_format = request.args.get("format", "pdf")

    return shell.convert_report(name, output_format)
