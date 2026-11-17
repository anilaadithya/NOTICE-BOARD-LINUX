import os
import sqlite3
from datetime import date
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
DB_PATH = os.environ.get("DATABASE_PATH", "/app/data/notices.db")

CATEGORIES = ["Academic", "Examination", "Events", "Placement", "General"]
STATUSES = ["active", "expired", "archived"]


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS notices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                notice_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active'
                    CHECK(status IN ('active', 'expired', 'archived')),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)


@app.route("/")
def index():
    return render_template("index.html", categories=CATEGORIES)


@app.get("/api/notices")
def list_notices():
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    active_only = request.args.get("active", "false").lower() == "true"

    query = "SELECT * FROM notices WHERE 1=1"
    params = []

    if search:
        query += " AND title LIKE ?"
        params.append(f"%{search}%")
    if category and category in CATEGORIES:
        query += " AND category = ?"
        params.append(category)
    if active_only:
        query += " AND status = 'active'"

    query += " ORDER BY notice_date DESC, id DESC"

    with get_db() as db:
        rows = db.execute(query, params).fetchall()
    return jsonify([dict(row) for row in rows])


@app.post("/api/notices")
def create_notice():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    category = str(data.get("category", "")).strip()
    notice_date = str(data.get("date", "")).strip()

    if not title or not category or not notice_date:
        return jsonify(error="Title, category and date are required."), 400
    if category not in CATEGORIES:
        return jsonify(error="Select a valid category."), 400

    try:
        date.fromisoformat(notice_date)
    except ValueError:
        return jsonify(error="Enter a valid date."), 400

    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO notices (title, category, notice_date) VALUES (?, ?, ?)",
            (title, category, notice_date)
        )
        notice_id = cursor.lastrowid
        row = db.execute("SELECT * FROM notices WHERE id = ?", (notice_id,)).fetchone()

    return jsonify(dict(row)), 201


@app.put("/api/notices/<int:notice_id>")
def update_notice(notice_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    category = str(data.get("category", "")).strip()
    notice_date = str(data.get("date", "")).strip()

    if not title or not category or not notice_date:
        return jsonify(error="Title, category and date are required."), 400
    if category not in CATEGORIES:
        return jsonify(error="Select a valid category."), 400
    try:
        date.fromisoformat(notice_date)
    except ValueError:
        return jsonify(error="Enter a valid date."), 400

    with get_db() as db:
        cursor = db.execute(
            """UPDATE notices
               SET title = ?, category = ?, notice_date = ?
               WHERE id = ?""",
            (title, category, notice_date, notice_id)
        )
        if cursor.rowcount == 0:
            return jsonify(error="Notice not found."), 404
        row = db.execute("SELECT * FROM notices WHERE id = ?", (notice_id,)).fetchone()

    return jsonify(dict(row))


@app.patch("/api/notices/<int:notice_id>/status")
def change_status(notice_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in STATUSES:
        return jsonify(error="Invalid status."), 400

    with get_db() as db:
        cursor = db.execute(
            "UPDATE notices SET status = ? WHERE id = ?",
            (status, notice_id)
        )
        if cursor.rowcount == 0:
            return jsonify(error="Notice not found."), 404
        row = db.execute("SELECT * FROM notices WHERE id = ?", (notice_id,)).fetchone()

    return jsonify(dict(row))


@app.delete("/api/notices/<int:notice_id>")
def delete_notice(notice_id):
    with get_db() as db:
        cursor = db.execute("DELETE FROM notices WHERE id = ?", (notice_id,))
        if cursor.rowcount == 0:
            return jsonify(error="Notice not found."), 404
    return jsonify(message="Notice deleted.")


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
