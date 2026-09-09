"""
CampusSync - Database Layer (Supabase / Postgres)
---------------------------------------------------
Replaces the old aiosqlite-based database.py.
Uses the official `supabase-py` client (sync under the hood,
wrapped here so main.py's async calls don't need to change).

Setup:
    pip install supabase

.env additions:
    SUPABASE_URL      = https://xxxxxxxx.supabase.co
    SUPABASE_KEY      = <service_role key — server-side only, NEVER ship to Flutter>

Run schema.sql in the Supabase SQL Editor before using this.
"""

import json
import os
import random
import string
from datetime import datetime
from typing import Optional

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")


def _generate_invite_code(length: int = 6) -> str:
    """Short, shareable, unambiguous invite code (no 0/O/1/I)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choices(alphabet, k=length))


class Database:

    def __init__(self):
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    async def init(self):
        """
        No-op for Supabase — tables are created once via schema.sql,
        not on every app startup. Kept here so main.py's
        `await db.init()` call in the startup event doesn't need editing.
        """
        print("[DB] Using Supabase — schema managed via schema.sql ✅")

    # ── USERS ──────────────────────────────────────────────────────────────

    async def upsert_user(self, data: dict) -> int:
        """Insert new user or update existing one by username. Returns user_id."""
        existing = self.client.table("users").select("id").eq("username", data["username"]).execute()

        payload = {
            "username":        data["username"],
            "cookies":         data["cookies"],       # pass dict directly — jsonb column
            "fcm_token":       data["fcm_token"],
            "whatsapp_number": data["whatsapp_number"],
            "sync_data":       data["sync_data"],      # dict, not json.dumps()
            "last_sync":       data["last_sync"],
        }

        if existing.data:
            user_id = existing.data[0]["id"]
            self.client.table("users").update(payload).eq("id", user_id).execute()
        else:
            result = self.client.table("users").insert(payload).execute()
            user_id = result.data[0]["id"]

        return user_id

    async def get_user(self, user_id: int) -> Optional[dict]:
        result = self.client.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None

    async def get_user_by_username(self, username: str) -> Optional[dict]:
        result = self.client.table("users").select("*").eq("username", username).execute()
        return result.data[0] if result.data else None

    async def get_all_users(self) -> list:
        result = self.client.table("users").select("*").execute()
        return result.data or []

    async def update_user_sync_data(self, user_id: int, data: dict):
        self.client.table("users").update({
            "sync_data":      data["sync_data"],
            "last_sync":      data["last_sync"],
            "sent_reminders": data["sent_reminders"],
        }).eq("id", user_id).execute()

    async def update_user_settings(self, user_id: int, settings: dict):
        payload = {
            "whatsapp_enabled": settings["whatsapp_enabled"],
            "push_enabled":     settings["push_enabled"],
            "reminder_minutes": settings["reminder_minutes"],
        }
        if "whatsapp_number" in settings:
            payload["whatsapp_number"] = settings["whatsapp_number"]
        self.client.table("users").update(payload).eq("id", user_id).execute()

    async def delete_user(self, user_id: int):
        """Deletes the user; group_members rows cascade automatically."""
        self.client.table("users").delete().eq("id", user_id).execute()

    # ── COURSE GROUPS (new) ──────────────────────────────────────────────────

    async def create_group(self, crsid: int, colid: int, course_name: str, created_by: int) -> dict:
        """Creates a new group for a course and returns it (with invite_code)."""
        code = _generate_invite_code()
        # Retry on the rare invite_code collision
        for _ in range(5):
            existing = self.client.table("course_groups").select("id").eq("invite_code", code).execute()
            if not existing.data:
                break
            code = _generate_invite_code()

        result = self.client.table("course_groups").insert({
            "crsid":       crsid,
            "colid":       colid,
            "course_name": course_name,
            "invite_code": code,
            "created_by":  created_by,
        }).execute()

        group = result.data[0]
        # Creator auto-joins their own group
        await self.join_group(group["id"], created_by)
        return group

    async def get_group_by_invite_code(self, invite_code: str) -> Optional[dict]:
        result = self.client.table("course_groups").select("*").eq("invite_code", invite_code.upper()).execute()
        return result.data[0] if result.data else None

    async def join_group(self, group_id: int, user_id: int):
        """Adds a user to a group. Safe to call if already a member (upsert)."""
        self.client.table("group_members").upsert({
            "group_id": group_id,
            "user_id":  user_id,
        }).execute()

    async def get_group_members(self, group_id: int) -> list:
        """Returns the full user rows for everyone in a group."""
        member_rows = self.client.table("group_members").select("user_id").eq("group_id", group_id).execute()
        user_ids = [row["user_id"] for row in (member_rows.data or [])]
        if not user_ids:
            return []
        users_result = self.client.table("users").select("*").in_("id", user_ids).execute()
        return users_result.data or []

    async def get_groups_for_user(self, user_id: int) -> list:
        """Returns all groups a given user belongs to."""
        member_rows = self.client.table("group_members").select("group_id").eq("user_id", user_id).execute()
        group_ids = [row["group_id"] for row in (member_rows.data or [])]
        if not group_ids:
            return []
        groups_result = self.client.table("course_groups").select("*").in_("id", group_ids).execute()
        return groups_result.data or []

    # ── SCHEDULED SUBMISSIONS (local JSON — no extra Supabase table required) ─

    def _submissions_path(self) -> str:
        data_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(data_dir, exist_ok=True)
        return os.path.join(data_dir, "scheduled_submissions.json")

    def _uploads_dir(self) -> str:
        path = os.path.join(os.path.dirname(__file__), "data", "uploads")
        os.makedirs(path, exist_ok=True)
        return path

    def _read_submissions(self) -> list:
        path = self._submissions_path()
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            try:
                return json.loads(f.read()) or []
            except json.JSONDecodeError:
                return []

    def _write_submissions(self, rows: list):
        with open(self._submissions_path(), "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2)

    async def create_scheduled_submission(self, row: dict) -> dict:
        rows = self._read_submissions()
        next_id = max((r.get("id", 0) for r in rows), default=0) + 1
        row["id"] = next_id
        rows.append(row)
        self._write_submissions(rows)
        return row

    async def list_scheduled_submissions(self, user_id: int) -> list:
        return [r for r in self._read_submissions() if r.get("user_id") == user_id]

    async def due_scheduled_submissions(self, now_iso: str) -> list:
        return [
            r for r in self._read_submissions()
            if r.get("status") == "scheduled" and r.get("scheduled_for", "") <= now_iso
        ]

    async def update_submission(self, submission_id: int, updates: dict) -> Optional[dict]:
        rows = self._read_submissions()
        updated = None
        for r in rows:
            if r.get("id") == submission_id:
                r.update(updates)
                updated = r
                break
        self._write_submissions(rows)
        return updated
