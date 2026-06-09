import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

_default_dir = Path(__file__).resolve().parents[2]
AUTH_DB_PATH = Path(os.getenv("AUTH_DB_DIR", str(_default_dir))) / "auth.db"


@contextmanager
def get_db():
    conn = sqlite3.connect(str(AUTH_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    AUTH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS approved_emails (
                email TEXT PRIMARY KEY,
                added_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL DEFAULT '',
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)
        # migrate existing DB: add username column if missing
        cols = {r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()}
        if "username" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT ''")
            conn.execute("UPDATE users SET username = email WHERE username = ''")
        if "email" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''")
        conn.commit()
