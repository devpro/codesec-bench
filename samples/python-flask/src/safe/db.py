"""Correct counterpart of src/db.py.

Same driver, same statement, same variable names.
The owner is bound as a parameter instead of being formatted into the text.

Any finding reported in this file is a false positive.
"""

import sqlite3

from safe.config import DATABASE_HOST, DATABASE_USER


def connect():
    return sqlite3.connect(":memory:")


def find_reports_by_owner(owner):
    connection = connect()
    cursor = connection.cursor()

    query = "SELECT id, title, owner FROM reports WHERE owner = ?"
    cursor.execute(query, (owner,))

    return cursor.fetchall()


def describe_connection():
    return f"{DATABASE_USER}@{DATABASE_HOST}"
