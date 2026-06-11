import os
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from .database import get_db

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_ALGORITHM = "HS256"


def _secret() -> str:
    s = os.getenv("JWT_SECRET", "")
    if not s:
        raise RuntimeError("JWT_SECRET env var is not set. Cannot issue tokens.")
    return s


def _expire_hours() -> int:
    return int(os.getenv("JWT_EXPIRE_HOURS", "8"))


# ── Passwords ─────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


# ── Tokens ────────────────────────────────────────────────────────────────────

def create_token(email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=_expire_hours())
    return jwt.encode({"sub": email, "role": role, "exp": expire}, _secret(), algorithm=_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=[_ALGORITHM])


# ── Users ─────────────────────────────────────────────────────────────────────

def get_user(username: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT username, email, hashed_password, role, created_at FROM users WHERE username = ?",
            (username.lower(),),
        ).fetchone()
        return dict(row) if row else None


def create_user(username: str, hashed_password: str, role: str = "student", email: str = "") -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT INTO users (username, email, hashed_password, role) VALUES (?, ?, ?, ?)",
            (username.lower(), email.lower(), hashed_password, role),
        )
        conn.commit()


def update_password(username: str, new_hashed: str) -> None:
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET hashed_password = ? WHERE username = ?",
            (new_hashed, username.lower()),
        )
        conn.commit()


def delete_user(username: str) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM users WHERE username = ?", (username.lower(),))
        conn.commit()


def list_users() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT username, email, role, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


# ── Whitelist ─────────────────────────────────────────────────────────────────

def is_email_approved(email: str) -> bool:
    with get_db() as conn:
        return conn.execute(
            "SELECT 1 FROM approved_emails WHERE email = ?", (email.lower(),)
        ).fetchone() is not None


def add_approved_emails(emails: list[str]) -> None:
    with get_db() as conn:
        conn.executemany(
            "INSERT OR IGNORE INTO approved_emails (email) VALUES (?)",
            [(e.lower(),) for e in emails],
        )
        conn.commit()


def remove_approved_email(email: str) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM approved_emails WHERE email = ?", (email.lower(),))
        conn.commit()


def list_approved_emails() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT email, added_at FROM approved_emails ORDER BY added_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


# ── Admin seeding ─────────────────────────────────────────────────────────────

def seed_admin(username: str, password: str) -> None:
    """Create the admin account on first run; skip if it already exists."""
    if get_user(username):
        return
    create_user(username, hash_password(password), role="admin")
    print(f"[AUTH] Admin account created: {username}")
