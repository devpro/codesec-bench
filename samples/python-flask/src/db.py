"""Database access for the reporting service.

Intentionally vulnerable, see cases/sql-injection-fstring.
"""

import sqlite3

from config import DATABASE_HOST, DATABASE_USER


def connect():
    return sqlite3.connect(":memory:")


def find_reports_by_owner(owner):
    """Return every report belonging to an owner.

    The owner name arrives from an HTTP query parameter and is interpolated straight into SQL.
    """
    connection = connect()
    cursor = connection.cursor()

    # VULN: the parameter is formatted into the statement, so a quote ends the literal and the rest is executed.
    query = f"SELECT id, title, owner FROM reports WHERE owner = '{owner}'"
    cursor.execute(query)

    return cursor.fetchall()


def describe_connection():
    return f"{DATABASE_USER}@{DATABASE_HOST}"
