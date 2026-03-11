import sqlite3
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.settings import DB_PATH

def conn():
    return sqlite3.connect(DB_PATH)

def _try_alter(con, sql: str):
    try:
        con.execute(sql)
        con.commit()
    except sqlite3.OperationalError:
        pass

def init_db():
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            disease_truth TEXT NOT NULL,
            symptoms_truth_json TEXT NOT NULL,
            slots_json TEXT NOT NULL DEFAULT '{}'
        )
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
        """)
        con.commit()

        _try_alter(con, "ALTER TABLE sessions ADD COLUMN is_closed INTEGER NOT NULL DEFAULT 0")
        _try_alter(con, "ALTER TABLE sessions ADD COLUMN final_status TEXT")
        _try_alter(con, "ALTER TABLE sessions ADD COLUMN final_feedback TEXT")
        _try_alter(con, "ALTER TABLE sessions ADD COLUMN revealed_answer TEXT")

def create_session(session_id: str, disease_truth: str, symptoms_truth: List[Dict[str, Any]]):
    now = datetime.utcnow().isoformat()
    with conn() as con:
        con.execute(
            """
            INSERT INTO sessions (
              id, created_at, disease_truth, symptoms_truth_json, slots_json,
              is_closed, final_status, final_feedback, revealed_answer
            )
            VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, NULL)
            """,
            (session_id, now, disease_truth, json.dumps(symptoms_truth), json.dumps({})),
        )
        con.commit()

def add_message(session_id: str, role: str, text: str):
    now = datetime.utcnow().isoformat()
    with conn() as con:
        con.execute(
            "INSERT INTO messages (session_id, role, text, created_at) VALUES (?, ?, ?, ?)",
            (session_id, role, text, now),
        )
        con.commit()

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    with conn() as con:
        row = con.execute(
            """
            SELECT id, created_at, disease_truth, symptoms_truth_json, slots_json,
                   is_closed, final_status, final_feedback, revealed_answer
            FROM sessions WHERE id=?
            """,
            (session_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "created_at": row[1],
        "disease_truth": row[2],
        "symptoms_truth": json.loads(row[3]),
        "slots": json.loads(row[4]),
        "is_closed": bool(row[5] or 0),
        "final_status": row[6],
        "final_feedback": row[7],
        "revealed_answer": row[8],
    }

def update_slots(session_id: str, slots: Dict[str, Any]):
    with conn() as con:
        con.execute(
            "UPDATE sessions SET slots_json=? WHERE id=?",
            (json.dumps(slots), session_id),
        )
        con.commit()

def close_session(session_id: str, status: str, feedback: str, revealed_answer: str):
    with conn() as con:
        con.execute(
            """
            UPDATE sessions
            SET is_closed=1,
                final_status=?,
                final_feedback=?,
                revealed_answer=?
            WHERE id=?
            """,
            (status, feedback, revealed_answer, session_id),
        )
        con.commit()

def list_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    with conn() as con:
        rows = con.execute(
            """
            SELECT
              s.id,
              s.created_at,
              s.is_closed,
              s.final_status,
              (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count
            FROM sessions s
            ORDER BY s.created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    out = []
    for (sid, created_at, is_closed, final_status, msg_count) in rows:
        status = (final_status or "IN_PROGRESS") if (is_closed or 0) else "IN_PROGRESS"
        out.append({
            "id": sid,
            "created_at": created_at,
            "status": status,
            "message_count": int(msg_count or 0),
        })
    return out

def get_messages(session_id: str) -> List[Dict[str, Any]]:
    with conn() as con:
        rows = con.execute(
            "SELECT role, text, created_at FROM messages WHERE session_id=? ORDER BY id ASC",
            (session_id,),
        ).fetchall()
    return [{"role": r[0], "text": r[1], "created_at": r[2]} for r in rows]

def compute_stats() -> Dict[str, Any]:
    with conn() as con:
        total_sessions = con.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        total_messages = con.execute("SELECT COUNT(*) FROM messages").fetchone()[0]

        correct = con.execute(
            "SELECT COUNT(*) FROM sessions WHERE is_closed=1 AND final_status='CORRECT'"
        ).fetchone()[0]
        partially = con.execute(
            "SELECT COUNT(*) FROM sessions WHERE is_closed=1 AND final_status='PARTIALLY_CORRECT'"
        ).fetchone()[0]
        wrong = con.execute(
            "SELECT COUNT(*) FROM sessions WHERE is_closed=1 AND final_status='WRONG'"
        ).fetchone()[0]
        in_progress = con.execute(
            "SELECT COUNT(*) FROM sessions WHERE is_closed=0"
        ).fetchone()[0]

    return {
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "correct": correct,
        "partially_correct": partially,
        "wrong": wrong,
        "in_progress": in_progress,
    }
