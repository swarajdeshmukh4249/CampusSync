"""
CampusSync - Database Layer
----------------------------
Uses SQLite for development (easy, no setup needed).
Can be swapped for PostgreSQL in production by 
changing the connection string.

Tables:
  users — stores user info, cookies, sync data
"""

import aiosqlite
import json
from datetime import datetime


DB_PATH = "campussync.db"


class Database:

    async def init(self):
        """Create tables if they don't exist."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id               INTEGER PRIMARY KEY AUTOINCREMENT,
                    username         TEXT UNIQUE NOT NULL,
                    cookies          TEXT NOT NULL,
                    fcm_token        TEXT,
                    whatsapp_number  TEXT,
                    whatsapp_enabled INTEGER DEFAULT 1,
                    push_enabled     INTEGER DEFAULT 1,
                    reminder_minutes INTEGER DEFAULT 20,
                    sync_data        TEXT DEFAULT '{}',
                    sent_reminders   TEXT DEFAULT '[]',
                    last_sync        TEXT,
                    created_at       TEXT DEFAULT (datetime('now'))
                )
            """)
            await db.commit()
        print("[DB] Database initialized ✅")


    async def upsert_user(self, data: dict) -> int:
        """Insert new user or update existing one. Returns user_id."""
        async with aiosqlite.connect(DB_PATH) as db:
            # Check if user exists
            cursor = await db.execute(
                "SELECT id FROM users WHERE username = ?", (data["username"],)
            )
            row = await cursor.fetchone()

            if row:
                # Update existing user
                user_id = row[0]
                await db.execute("""
                    UPDATE users SET
                        cookies          = ?,
                        fcm_token        = ?,
                        whatsapp_number  = ?,
                        sync_data        = ?,
                        last_sync        = ?
                    WHERE id = ?
                """, (
                    data["cookies"],
                    data["fcm_token"],
                    data["whatsapp_number"],
                    data["sync_data"],
                    data["last_sync"],
                    user_id
                ))
            else:
                # Insert new user
                cursor = await db.execute("""
                    INSERT INTO users 
                        (username, cookies, fcm_token, whatsapp_number, 
                         sync_data, last_sync)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    data["username"],
                    data["cookies"],
                    data["fcm_token"],
                    data["whatsapp_number"],
                    data["sync_data"],
                    data["last_sync"],
                ))
                user_id = cursor.lastrowid

            await db.commit()
            return user_id


    async def get_user(self, user_id: int) -> dict | None:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM users WHERE id = ?", (user_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None


    async def get_user_by_username(self, username: str) -> dict | None:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM users WHERE username = ?", (username,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None


    async def get_all_users(self) -> list:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM users")
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


    async def update_user_sync_data(self, user_id: int, data: dict):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                UPDATE users SET
                    sync_data      = ?,
                    last_sync      = ?,
                    sent_reminders = ?
                WHERE id = ?
            """, (
                data["sync_data"],
                data["last_sync"],
                data["sent_reminders"],
                user_id
            ))
            await db.commit()


    async def update_user_settings(self, user_id: int, settings: dict):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                UPDATE users SET
                    whatsapp_enabled = ?,
                    push_enabled     = ?,
                    reminder_minutes = ?
                WHERE id = ?
            """, (
                settings["whatsapp_enabled"],
                settings["push_enabled"],
                settings["reminder_minutes"],
                user_id
            ))
            await db.commit()


    async def delete_user(self, user_id: int):
        """Completely delete user and all their data."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
            await db.commit()