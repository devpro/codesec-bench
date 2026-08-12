"""Correct counterpart of src/config.py.

Same names, same shape, same consumers.
The values come from the environment instead of the source tree.

Any finding reported in this file is a false positive.
"""

import os

DATABASE_PASSWORD = os.environ["REPORTING_DB_PASSWORD"]
SERVICE_API_TOKEN = os.environ["REPORTING_API_TOKEN"]

DATABASE_HOST = os.environ.get("REPORTING_DB_HOST", "reporting-db.internal")
DATABASE_USER = os.environ.get("REPORTING_DB_USER", "reporting_app")

REPORTS_DIR = os.environ.get("REPORTING_DIR", "/var/lib/reports")

ALLOWED_HOSTS = ("reports.internal", "metrics.internal")
