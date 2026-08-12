"""Configuration for the reporting service.

Intentionally vulnerable, see cases/hardcoded-credential.
"""

# VULN: credentials committed in source, readable by anyone with repository access.
# Rotating them means a code change and a deployment, so in practice they never rotate.
DATABASE_PASSWORD = "pr0d-Reporting-2024!"
SERVICE_API_TOKEN = "sk_live_9f2a4c8e1b7d3f6a0c5e8b2d4f7a1c9e"

DATABASE_HOST = "reporting-db.internal"
DATABASE_USER = "reporting_app"

REPORTS_DIR = "/var/lib/reports"

ALLOWED_HOSTS = ("reports.internal", "metrics.internal")
