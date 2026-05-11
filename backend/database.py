import mysql.connector
from mysql.connector import Error
from contextlib import contextmanager
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "elyasx"),
}


def get_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        raise Exception(f"Database connection failed: {e}")


def query(sql: str, params: tuple = (), fetch: str = "all"):
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        if fetch == "one":
            return cur.fetchone()
        if fetch == "all":
            return cur.fetchall()
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def execute(sql: str, params: tuple = ()):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


@contextmanager
def transaction():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
