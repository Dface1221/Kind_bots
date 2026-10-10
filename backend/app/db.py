import sqlite3
import json
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data.db")

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                url TEXT UNIQUE,
                title TEXT,
                domain TEXT,
                topic TEXT,
                excerpt TEXT,
                dateAdded TEXT,
                status TEXT,
                error TEXT,
                extracted_text TEXT
            )
        ''')
        try:
            conn.execute('ALTER TABLE articles ADD COLUMN summary TEXT')
        except sqlite3.OperationalError:
            pass

        try:
            conn.execute('ALTER TABLE articles ADD COLUMN takeaways TEXT')
        except sqlite3.OperationalError:
            pass

        conn.execute('''
            CREATE TABLE IF NOT EXISTS trails (
                id TEXT PRIMARY KEY,
                title TEXT,
                status TEXT,
                duration INTEGER,
                narrationStyle TEXT,
                targetDurationMinutes INTEGER,
                chapters JSON
            )
        ''')
        try:
            conn.execute('ALTER TABLE trails ADD COLUMN audioUrl TEXT')
        except sqlite3.OperationalError:
            pass
        conn.commit()

# Call immediately on module load
init_db()
