"""
CampusSync - FastAPI Backend
-----------------------------
Main server. Handles:
  • User registration & login (stores cookies, NOT passwords)
  • Background polling of VOLP every 15 minutes
  • Triggering push notifications & WhatsApp alerts
  • REST API for the Flutter app

Run with:
    uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import json, os, asyncio

from volp_client import VOLPClient
from deadline_detector import DeadlineDetector
from notifier import Notifier
from database import Database


# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CampusSync API",
    description="Backend for CampusSync — VOLP companion app for VIT students",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

db        = Database()
notifier  = Notifier()
scheduler = AsyncIOScheduler()
detector  = DeadlineDetector()


# ─── Request Models (what the Flutter app sends) ───────────────────────────────
class LoginRequest(BaseModel):
    username:      str
    password:      str
    fcm_token:     str   # Firebase push notification token from Flutter app
    whatsapp_number: str  # e.g. "919876543210" (with country code)

class RefreshRequest(BaseModel):
    user_id: int

class UpdateSettingsRequest(BaseModel):
    user_id:          int
    whatsapp_enabled: bool
    push_enabled:     bool
    reminder_minutes: int  # How many minutes before deadline to remind (default 20)


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "CampusSync API is running 🚀", "version": "1.0.0"}


@app.post("/auth/login")
async def login(request: LoginRequest):
    """
    Called when student logs into the Flutter app.
    
    Flow:
    1. We try logging into VOLP with provided credentials
    2. If success, we save ONLY the cookies (not password)
    3. We return a user_id to the Flutter app
    4. Password is immediately discarded
    """
    # Check if user already exists
    existing_user = await db.get_user_by_username(request.username)

    # Attempt VOLP login
    client = VOLPClient()
    result = await client.login(request.username, request.password)

    if not result["success"]:
        await client.close()
        raise HTTPException(status_code=401, detail=result["message"])

    # Get session cookies (NOT the password)
    cookies = client.get_session_cookies()

    # Do an initial sync to get all their data
    sync_data = await client.full_sync()
    await client.close()

    # Save/update user in database
    user_id = await db.upsert_user({
        "username":         request.username,
        "cookies":          json.dumps(cookies),       # Stored encrypted in production
        "fcm_token":        request.fcm_token,
        "whatsapp_number":  request.whatsapp_number,
        "whatsapp_enabled": True,
        "push_enabled":     True,
        "reminder_minutes": 20,
        "last_sync":        datetime.now().isoformat(),
        "sync_data":        json.dumps(sync_data),
    })

    # Return user info to Flutter app (no cookies, no passwords)
    return {
        "success":  True,
        "user_id":  user_id,
        "username": request.username,
        "courses":  sync_data["courses"],
        "message":  "Logged in successfully! We'll keep an eye on your assignments 👀"
    }


@app.get("/assignments/{user_id}")
async def get_assignments(user_id: int):
    """Returns all upcoming assignments for a user."""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sync_data = json.loads(user["sync_data"])
    all_assignments = []

    for key, assignment_list in sync_data.get("assignments", {}).items():
        for a in assignment_list:
            a["course_name"] = detector._get_course_name(key, sync_data)
            all_assignments.append(a)

    # Sort by due date
    def sort_key(a):
        due = detector._parse_date(a.get("due_date", ""))
        return due or datetime.max

    all_assignments.sort(key=sort_key)

    return {
        "assignments": all_assignments,
        "last_sync":   user["last_sync"]
    }


@app.get("/courses/{user_id}")
async def get_courses(user_id: int):
    """Returns all courses for a user."""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sync_data = json.loads(user["sync_data"])
    return {"courses": sync_data.get("courses", [])}


@app.get("/announcements/{user_id}")
async def get_announcements(user_id: int):
    """Returns all announcements for a user."""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sync_data = json.loads(user["sync_data"])
    all_announcements = []

    for key, ann_list in sync_data.get("announcements", {}).items():
        for a in ann_list:
            a["course_name"] = detector._get_course_name(key, sync_data)
            all_announcements.append(a)

    return {"announcements": all_announcements}


@app.get("/materials/{user_id}")
async def get_materials(user_id: int):
    """Returns all materials uploaded across all courses."""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sync_data = json.loads(user["sync_data"])
    all_materials = []

    for key, mat_list in sync_data.get("materials", {}).items():
        for m in mat_list:
            m["course_name"] = detector._get_course_name(key, sync_data)
            all_materials.append(m)

    return {"materials": all_materials}


@app.post("/auth/delete-account/{user_id}")
async def delete_account(user_id: int):
    """
    Completely deletes user data — cookies, sync data, everything.
    Required by our privacy commitment.
    """
    await db.delete_user(user_id)
    return {"success": True, "message": "All your data has been deleted."}


@app.put("/settings/{user_id}")
async def update_settings(user_id: int, request: UpdateSettingsRequest):
    """Update notification preferences."""
    await db.update_user_settings(user_id, {
        "whatsapp_enabled": request.whatsapp_enabled,
        "push_enabled":     request.push_enabled,
        "reminder_minutes": request.reminder_minutes,
    })
    return {"success": True}


# ─── BACKGROUND SCHEDULER — runs every 15 minutes ─────────────────────────────
async def sync_all_users():
    """
    The heart of CampusSync.
    Runs every 15 minutes. For each registered user:
    1. Restores their VOLP session using stored cookies
    2. Fetches fresh data from VOLP
    3. Compares with old data to detect changes
    4. Sends notifications for any changes/approaching deadlines
    """
    print(f"\n[SCHEDULER] Starting sync for all users at {datetime.now()}")

    users = await db.get_all_users()
    print(f"[SCHEDULER] {len(users)} users to sync")

    for user in users:
        try:
            await sync_single_user(user)
        except Exception as e:
            print(f"[SCHEDULER] Error syncing user {user['id']}: {e}")

    print(f"[SCHEDULER] All users synced ✅\n")


async def sync_single_user(user: dict):
    """Sync one user and send notifications if needed."""
    user_id  = user["id"]
    username = user["username"]
    print(f"  [SYNC] User: {username}")

    # Restore session from stored cookies
    client  = VOLPClient()
    cookies = json.loads(user["cookies"])
    session_valid = client.restore_session(cookies)

    if not session_valid:
        # Cookies expired — notify user to re-login
        print(f"  [SYNC] Session expired for {username}, notifying...")
        await notifier.send_push(
            fcm_token = user["fcm_token"],
            title     = "⚠️ Please Re-login to CampusSync",
            body      = "Your VOLP session has expired. Open the app to refresh.",
        )
        await client.close()
        return

    # Fetch fresh data
    old_data  = json.loads(user.get("sync_data", "{}"))
    new_data  = await client.full_sync()
    await client.close()

    # Detect what changed
    alerts = detector.detect_changes(old_data, new_data)
    print(f"  [SYNC] {len(alerts)} alerts generated for {username}")

    # Get sent reminders to avoid duplicates
    sent_reminders = set(json.loads(user.get("sent_reminders", "[]")))
    new_sent       = set(sent_reminders)

    # Send notifications
    for alert in alerts:
        # For deadline reminders, check if we already sent this one
        if alert["type"] == "deadline_approaching":
            key = alert.get("reminder_key", "")
            if key in sent_reminders:
                continue  # Already sent, skip
            new_sent.add(key)

        # Send push notification
        if user.get("push_enabled", True):
            await notifier.send_push(
                fcm_token = user["fcm_token"],
                title     = alert["title"],
                body      = alert["body"],
                data      = {"type": alert["type"], "course": alert["course"]}
            )

        # Send WhatsApp message
        if user.get("whatsapp_enabled", True):
            await notifier.send_whatsapp(
                to      = user["whatsapp_number"],
                message = f"*{alert['title']}*\n{alert['body']}\n\n_CampusSync_"
            )

    # Save updated data and sent reminders
    await db.update_user_sync_data(user_id, {
        "sync_data":     json.dumps(new_data),
        "last_sync":     datetime.now().isoformat(),
        "sent_reminders": json.dumps(list(new_sent)),
    })


# ─── APP STARTUP & SHUTDOWN ───────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await db.init()
    # Run sync every 15 minutes
    scheduler.add_job(sync_all_users, "interval", minutes=15, id="main_sync")
    scheduler.start()
    print("✅ CampusSync backend started. Scheduler running every 15 minutes.")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()
    print("CampusSync backend stopped.")