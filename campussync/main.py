"""
CampusSync - FastAPI Backend
-----------------------------
Main server. Handles:
  • User registration & login (stores cookies, NOT passwords)
  • Background polling of VOLP every 15 minutes
  • Triggering push notifications & WhatsApp alerts
  • REST API for the Flutter app and web dashboard

Run with:
    uvicorn main:app --reload --port 8081
"""

from fastapi import FastAPI, HTTPException, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from uuid import uuid4
import json
import os
import shutil

from volp_client import VOLPClient
from deadline_detector import DeadlineDetector
from notifier import Notifier
from database import Database


app = FastAPI(
    title="CampusSync API",
    description="Backend for CampusSync — VOLP companion app for VIT students",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db        = Database()
notifier  = Notifier()
scheduler = AsyncIOScheduler()
detector  = DeadlineDetector()


def as_obj(value, default=None):
    """Supabase jsonb may already be a dict; older rows may be JSON strings."""
    if value is None:
        return {} if default is None else default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {} if default is None else default
    return default if default is not None else {}


def person_name(value) -> str:
    if isinstance(value, dict):
        return (
            value.get("name")
            or value.get("instructor_name")
            or value.get("full_name")
            or ""
        )
    return str(value or "").strip() or "—"


def progress_pct(course: dict) -> int:
    raw = course.get("progress")
    if raw is None:
        raw = course.get("completion_percentage", 0)
    try:
        n = float(raw)
    except (TypeError, ValueError):
        return 0
    if 0 < n <= 1:
        return int(round(n * 100))
    return max(0, min(100, int(round(n))))


def course_title(course: dict) -> str:
    return (
        course.get("display_name")
        or course.get("course_name")
        or course.get("title")
        or "Unknown Course"
    )


def iter_assignments(sync_data: dict):
    assignments = as_obj(sync_data.get("assignments"), {})
    if isinstance(assignments, list):
        for item in assignments:
            if isinstance(item, dict):
                yield "", item
        return
    if isinstance(assignments, dict):
        for key, items in assignments.items():
            for item in items or []:
                if isinstance(item, dict):
                    yield str(key), item


def assignment_payload(raw: dict, course_name: str) -> dict:
    due = detector._parse_date(raw.get("due_date", ""))
    submitted = bool(raw.get("is_submitted"))
    urgent = False
    if due and not submitted:
        urgent = due - datetime.now() <= timedelta(hours=48) and due >= datetime.now()
    return {
        "assignment_id":   str(raw.get("assignment_id") or ""),
        "assignment_name": raw.get("assignment_name") or "Untitled assignment",
        "description":     raw.get("description") or "",
        "due_date":        raw.get("due_date") or "",
        "start_date":      raw.get("start_date") or "",
        "is_submitted":    submitted,
        "submission_date": raw.get("submission_date"),
        "max_marks":       raw.get("max_marks") or 0,
        "course_name":     course_name or raw.get("course_name") or "Unknown course",
        "crsid":           raw.get("crsid"),
        "colid":           raw.get("colid"),
        "urgent":          urgent or bool(raw.get("urgent")),
        "status":          "Submitted" if submitted else "Pending",
    }


def course_payload(course: dict, assignments_for_course: list) -> dict:
    pending = [a for a in assignments_for_course if not a.get("is_submitted")]
    next_due = None
    next_due_dt = None
    for a in pending:
        due = detector._parse_date(a.get("due_date", ""))
        if due and (next_due_dt is None or due < next_due_dt):
            next_due_dt = due
            next_due = a.get("due_date")
    return {
        "course_id":        str(course.get("crsid") or course.get("course_id") or ""),
        "crsid":            course.get("crsid") or 0,
        "colid":            course.get("colid") or 0,
        "title":            course_title(course),
        "course_name":      course.get("course_name") or "",
        "display_name":     course_title(course),
        "instructor":       person_name(course.get("instructor_name") or course.get("instructor")),
        "progress":         progress_pct(course),
        "is_active":        bool(course.get("is_active", True)),
        "is_archived":      bool(course.get("is_archived", False)),
        "assignment_count": len(assignments_for_course) or int(course.get("asscnt") or 0),
        "pending_count":    len(pending),
        "next_deadline":    next_due,
    }


def user_courses(user: dict) -> list:
    courses = as_obj(as_obj(user.get("sync_data")).get("courses"), [])
    return courses if isinstance(courses, list) else []


def shared_course_count(a: dict, b: dict) -> int:
    keys_a = {
        (str(c.get("crsid")), str(c.get("colid")))
        for c in user_courses(a)
        if c.get("crsid") is not None
    }
    keys_b = {
        (str(c.get("crsid")), str(c.get("colid")))
        for c in user_courses(b)
        if c.get("crsid") is not None
    }
    return len(keys_a & keys_b)


class CreateGroupRequest(BaseModel):
    user_id: int
    crsid:   int
    colid:   int

class JoinGroupRequest(BaseModel):
    user_id:     int
    invite_code: str

class LoginRequest(BaseModel):
    username:      str
    password:      str
    fcm_token:     str = ""
    whatsapp_number: str = ""

class RefreshRequest(BaseModel):
    user_id: int

class UpdateSettingsRequest(BaseModel):
    user_id:          int
    whatsapp_enabled: bool
    push_enabled:     bool
    reminder_minutes: int
    whatsapp_number:  str = ""


@app.post("/groups/create")
async def create_group(request: CreateGroupRequest):
    user = await db.get_user(request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    course_name = "Unknown Course"
    for course in user_courses(user):
        if str(course.get("crsid")) == str(request.crsid) and str(course.get("colid")) == str(request.colid):
            course_name = course_title(course)
            break

    group = await db.create_group(request.crsid, request.colid, course_name, request.user_id)
    return {"success": True, "group": group}


@app.post("/groups/join")
async def join_group(request: JoinGroupRequest):
    user = await db.get_user(request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    group = await db.get_group_by_invite_code(request.invite_code)
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    enrolled = any(
        str(c.get("crsid")) == str(group["crsid"]) and str(c.get("colid")) == str(group["colid"])
        for c in user_courses(user)
    )
    if not enrolled:
        raise HTTPException(status_code=403, detail="You're not enrolled in this course on VOLP")

    await db.join_group(group["id"], request.user_id)
    return {"success": True, "group": group}


@app.get("/groups/user/{user_id}")
async def list_user_groups(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    groups = await db.get_groups_for_user(user_id)
    result = []
    for group in groups:
        members = await db.get_group_members(group["id"])
        result.append({
            **group,
            "members": [{"id": m["id"], "username": m["username"]} for m in members],
        })
    return {"groups": result}


@app.get("/groups/{group_id}/status/{assignment_id}")
async def group_submission_status(group_id: int, assignment_id: str):
    members = await db.get_group_members(group_id)
    if not members:
        raise HTTPException(status_code=404, detail="Group not found or has no members")

    statuses = []
    for member in members:
        submitted = False
        for _, assignment in iter_assignments(as_obj(member.get("sync_data"))):
            if str(assignment.get("assignment_id")) == str(assignment_id):
                submitted = bool(assignment.get("is_submitted", False))
        statuses.append({
            "username":  member["username"],
            "submitted": submitted,
        })

    return {"group_id": group_id, "assignment_id": assignment_id, "members": statuses}


@app.get("/")
async def root():
    return {"message": "CampusSync API is running 🚀", "version": "1.0.0"}


@app.post("/auth/login")
async def login(request: LoginRequest):
    client = VOLPClient()
    result = await client.login(request.username, request.password)

    if not result["success"]:
        await client.close()
        raise HTTPException(status_code=401, detail=result["message"])

    cookies = client.get_session_cookies()
    sync_data = await client.full_sync()
    await client.close()

    user_id = await db.upsert_user({
        "username":         request.username,
        "cookies":          cookies,
        "fcm_token":        request.fcm_token,
        "whatsapp_number":  request.whatsapp_number,
        "whatsapp_enabled": True,
        "push_enabled":     True,
        "reminder_minutes": 20,
        "last_sync":        datetime.now().isoformat(),
        "sync_data":        sync_data,
    })

    return {
        "success":  True,
        "user_id":  user_id,
        "username": request.username,
        "courses":  sync_data.get("courses", []),
        "message":  "Logged in successfully! We'll keep an eye on your assignments 👀"
    }


@app.post("/auth/refresh")
async def refresh(request: RefreshRequest):
    user = await db.get_user(request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await sync_single_user(user)
    fresh = await db.get_user(request.user_id)
    return {
        "success": True,
        "last_sync": fresh.get("last_sync") if fresh else None,
        "message": "Synced with VOLP",
    }


@app.get("/assignments/{user_id}")
async def get_assignments(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sync_data = as_obj(user.get("sync_data"))
    all_assignments = []
    for key, raw in iter_assignments(sync_data):
        payload = assignment_payload(raw, detector._get_course_name(key, sync_data) if key else raw.get("course_name", ""))
        all_assignments.append(payload)

    def sort_key(a):
        due = detector._parse_date(a.get("due_date", ""))
        return due or datetime.max

    all_assignments.sort(key=sort_key)
    return {
        "assignments": all_assignments,
        "last_sync":   user.get("last_sync"),
    }


@app.get("/courses/{user_id}")
async def get_courses(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sync_data = as_obj(user.get("sync_data"))
    raw_courses = as_obj(sync_data.get("courses"), [])
    if not isinstance(raw_courses, list):
        raw_courses = []

    assignments_by_course = {}
    for key, raw in iter_assignments(sync_data):
        payload = assignment_payload(raw, detector._get_course_name(key, sync_data) if key else "")
        parts = key.split("_") if key else []
        crsid = str(raw.get("crsid") or (parts[0] if parts else ""))
        assignments_by_course.setdefault(crsid, []).append(payload)

    courses = []
    for course in raw_courses:
        if not isinstance(course, dict):
            continue
        crsid = str(course.get("crsid") or course.get("course_id") or "")
        courses.append(course_payload(course, assignments_by_course.get(crsid, [])))

    return {"courses": courses, "last_sync": user.get("last_sync")}


@app.get("/friends/{user_id}")
async def get_friends(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friends = {}
    all_users = await db.get_all_users()
    for other in all_users:
        if other["id"] == user_id:
            continue
        shared = shared_course_count(user, other)
        if shared:
            friends[other["id"]] = {
                "user_id": other["id"],
                "username": other["username"],
                "shared_courses": shared,
                "submitted": False,
                "source": "shared_course",
            }

    groups = await db.get_groups_for_user(user_id)
    for group in groups:
        members = await db.get_group_members(group["id"])
        for member in members:
            if member["id"] == user_id:
                continue
            entry = friends.setdefault(member["id"], {
                "user_id": member["id"],
                "username": member["username"],
                "shared_courses": shared_course_count(user, member),
                "submitted": False,
                "source": "group",
            })
            entry["source"] = "group"
            entry["group_id"] = group["id"]
            entry["group_name"] = group.get("course_name")

    return {"friends": list(friends.values())}


@app.get("/announcements/{user_id}")
async def get_announcements(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sync_data = as_obj(user.get("sync_data"))
    all_announcements = []
    announcements = as_obj(sync_data.get("announcements"), {})
    if isinstance(announcements, dict):
        for key, ann_list in announcements.items():
            for a in ann_list or []:
                if isinstance(a, dict):
                    item = dict(a)
                    item["course_name"] = detector._get_course_name(key, sync_data)
                    all_announcements.append(item)
    return {"announcements": all_announcements}


@app.get("/materials/{user_id}")
async def get_materials(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sync_data = as_obj(user.get("sync_data"))
    all_materials = []
    materials = as_obj(sync_data.get("materials"), {})
    if isinstance(materials, dict):
        for key, mat_list in materials.items():
            for m in mat_list or []:
                if isinstance(m, dict):
                    item = dict(m)
                    item["course_name"] = detector._get_course_name(key, sync_data)
                    all_materials.append(item)
    return {"materials": all_materials}


@app.post("/submissions/schedule")
async def schedule_submission(
    user_id: int = Form(...),
    assignment_id: str = Form(...),
    assignment_name: str = Form(""),
    course_name: str = Form(""),
    crsid: str = Form(""),
    colid: str = Form(""),
    scheduled_for: str = Form(...),
    file: UploadFile = File(...),
):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    due = detector._parse_date(scheduled_for.replace("T", " "))
    if not due:
        raise HTTPException(status_code=400, detail="Invalid schedule time")

    uploads = db._uploads_dir()
    stored_name = f"{uuid4().hex}_{os.path.basename(file.filename or 'upload.bin')}"
    dest = os.path.join(uploads, stored_name)
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)

    row = await db.create_scheduled_submission({
        "user_id": user_id,
        "assignment_id": assignment_id,
        "assignment_name": assignment_name,
        "course_name": course_name,
        "crsid": crsid,
        "colid": colid,
        "scheduled_for": due.isoformat(sep=" "),
        "original_filename": file.filename,
        "stored_path": dest,
        "status": "scheduled",
        "error": None,
        "created_at": datetime.now().isoformat(sep=" "),
    })
    return {"success": True, "submission": row}


@app.get("/submissions/{user_id}")
async def list_submissions(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"submissions": await db.list_scheduled_submissions(user_id)}


@app.post("/auth/delete-account/{user_id}")
async def delete_account(user_id: int):
    await db.delete_user(user_id)
    return {"success": True, "message": "All your data has been deleted."}


@app.put("/settings/{user_id}")
async def update_settings(user_id: int, request: UpdateSettingsRequest):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.update_user_settings(user_id, {
        "whatsapp_enabled": request.whatsapp_enabled,
        "push_enabled":     request.push_enabled,
        "reminder_minutes": request.reminder_minutes,
        "whatsapp_number":  request.whatsapp_number,
    })
    return {"success": True}


@app.get("/settings/{user_id}")
async def get_settings(user_id: int):
    """Return only notification preferences; never expose session cookies."""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "whatsapp_enabled": bool(user.get("whatsapp_enabled", True)),
        "push_enabled": bool(user.get("push_enabled", True)),
        "reminder_minutes": int(user.get("reminder_minutes") or 20),
        "whatsapp_number": user.get("whatsapp_number") or "",
    }


async def sync_all_users():
    print(f"\n[SCHEDULER] Starting sync for all users at {datetime.now()}")
    users = await db.get_all_users()
    print(f"[SCHEDULER] {len(users)} users to sync")
    for user in users:
        try:
            await sync_single_user(user)
        except Exception as e:
            print(f"[SCHEDULER] Error syncing user {user['id']}: {e}")
    print("[SCHEDULER] All users synced ✅\n")


async def sync_single_user(user: dict):
    user_id  = user["id"]
    username = user["username"]
    print(f"  [SYNC] User: {username}")

    client  = VOLPClient()
    cookies = as_obj(user.get("cookies"))
    session_valid = client.restore_session(cookies)

    if not session_valid:
        print(f"  [SYNC] Session expired for {username}, notifying...")
        if user.get("fcm_token"):
            await notifier.send_push(
                fcm_token = user["fcm_token"],
                title     = "⚠️ Please Re-login to CampusSync",
                body      = "Your VOLP session has expired. Open the app to refresh.",
            )
        await client.close()
        return

    old_data  = as_obj(user.get("sync_data"))
    new_data  = await client.full_sync()
    await client.close()

    alerts = detector.detect_changes(
        old_data,
        new_data,
        reminder_minutes=user.get("reminder_minutes", 20),
    )
    print(f"  [SYNC] {len(alerts)} alerts generated for {username}")

    sent_reminders = set(as_obj(user.get("sent_reminders"), []))
    if not isinstance(sent_reminders, set):
        sent_reminders = set(sent_reminders) if isinstance(sent_reminders, list) else set()
    new_sent = set(sent_reminders)

    for alert in alerts:
        if alert["type"] == "deadline_approaching":
            key = alert.get("reminder_key", "")
            if key in sent_reminders:
                continue
            new_sent.add(key)

        if user.get("push_enabled", True) and user.get("fcm_token"):
            await notifier.send_push(
                fcm_token = user["fcm_token"],
                title     = alert["title"],
                body      = alert["body"],
                data      = {"type": alert["type"], "course": alert["course"]}
            )

        if user.get("whatsapp_enabled", True) and user.get("whatsapp_number"):
            await notifier.send_whatsapp(
                to      = user["whatsapp_number"],
                message = f"*{alert['title']}*\n{alert['body']}\n\n_CampusSync_"
            )

    await db.update_user_sync_data(user_id, {
        "sync_data":      new_data,
        "last_sync":      datetime.now().isoformat(),
        "sent_reminders": list(new_sent),
    })


async def process_due_submissions():
    now = datetime.now().isoformat(sep=" ")
    due = await db.due_scheduled_submissions(now)
    for row in due:
        user = await db.get_user(row["user_id"])
        if not user:
            await db.update_submission(row["id"], {"status": "failed", "error": "User not found"})
            continue

        client = VOLPClient()
        cookies = as_obj(user.get("cookies"))
        if not client.restore_session(cookies):
            await client.close()
            await db.update_submission(row["id"], {
                "status": "failed",
                "error": "VOLP session expired — sign in again, then reschedule.",
            })
            continue

        crsid = row.get("crsid") or 0
        colid = row.get("colid") or 0
        try:
            crsid = int(crsid)
            colid = int(colid)
        except (TypeError, ValueError):
            crsid, colid = 0, 0

        result = await client.submit_assignment(
            crsid, colid, row.get("assignment_id"), row.get("stored_path"), row.get("original_filename") or "upload"
        )
        await client.close()
        if result.get("success"):
            await db.update_submission(row["id"], {"status": "submitted", "error": None})
        else:
            await db.update_submission(row["id"], {
                "status": "queued_local",
                "error": result.get("message") or "Could not submit to VOLP automatically. File is saved — submit from VOLP if needed.",
            })


@app.on_event("startup")
async def startup():
    await db.init()
    scheduler.add_job(sync_all_users, "interval", minutes=15, id="main_sync")
    scheduler.add_job(process_due_submissions, "interval", minutes=1, id="submissions")
    scheduler.start()
    print("✅ CampusSync backend started. Scheduler running every 15 minutes.")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()
    print("CampusSync backend stopped.")
