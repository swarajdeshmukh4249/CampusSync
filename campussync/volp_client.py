"""
CampusSync - VOLP API Client
-----------------------------
Built from live network inspection of classroom.volp.in

Confirmed API details:
  Login URL:   https://admin.volp.in/login/process
  Courses URL: https://learner.volp.in/learnerCourseDashboard/learnerCourseList
  Auth method: JWT Token (in header) + AWSALB cookies
  Login fields: { username, pwd }  ← "pwd" not "password"!
  
  Extra headers required per request:
    Token:             <jwt from login response>
    Uid:               swaraj.1251070064@vit.edu
    Ut:                Learner
    Device:            Web
    Latitude:          18.4561670837239   (VIT Pune)
    Longitude:         73.86629745074256  (VIT Pune)
    Organization-Code: null
"""

import httpx
import json
from datetime import datetime
from typing import Optional


# ─── VOLP API Endpoints (confirmed from network inspection) ────────────────────
LOGIN_URL         = "https://admin.volp.in/login/process"
COURSES_URL       = "https://learner.volp.in/learnerCourseDashboard/learnerCourseList"
ASSIGNMENTS_URL   = "https://learner.volp.in/learnerCourseDashboard/learnerAssignmentList"
MATERIALS_URL     = "https://learner.volp.in/learnerCourseDashboard/learnerMaterialList"
ANNOUNCEMENTS_URL = "https://learner.volp.in/learnerCourseDashboard/learnerAnnouncementList"

# VIT Pune coordinates — VOLP sends these with every request
VIT_LATITUDE  = "18.4561670837239"
VIT_LONGITUDE = "73.86629745074256"

# Base headers matching exactly what Chrome sends to VOLP
BASE_HEADERS = {
    "Accept":            "application/json, text/plain, */*",
    "Accept-Encoding":   "gzip, deflate, br, zstd",
    "Accept-Language":   "en-GB,en-US;q=0.9,en;q=0.8",
    "Content-Type":      "application/json;charset=UTF-8",
    "Origin":            "https://classroom.volp.in",
    "Referer":           "https://classroom.volp.in/",
    "User-Agent":        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Device":            "Web",
    "Latitude":          VIT_LATITUDE,
    "Longitude":         VIT_LONGITUDE,
    "Organization-Code": "null",
    "Sec-Fetch-Dest":    "empty",
    "Sec-Fetch-Mode":    "cors",
    "Sec-Fetch-Site":    "same-site",
}


class VOLPClient:
    """
    Communicates with VOLP's internal API.
    Uses JWT Token + AWSALB cookies for auth.
    Passwords are NEVER stored — only the token.
    """

    def __init__(self):
        self.http = httpx.AsyncClient(
            headers=BASE_HEADERS,
            follow_redirects=True,
            timeout=30.0
        )
        self.is_logged_in  = False
        self.cookie_expiry: Optional[float] = None
        self.jwt_token:     str = ""
        self.uid:           str = ""
        self.user_type:     str = "Learner"


    # ── LOGIN ──────────────────────────────────────────────────────────────────
    async def login(self, username: str, password: str) -> dict:
        """
        Logs into VOLP with exact payload format confirmed from DevTools:
          { "username": "...", "pwd": "..." }   ← "pwd" NOT "password"

        Returns: { success, message }
        Password is discarded immediately after this call.
        Only JWT token + cookies are kept.
        """
        try:
            payload = {
                "username": username,
                "pwd":      password,   # confirmed field name from network tab
            }

            response = await self.http.post(LOGIN_URL, json=payload)

            if response.status_code == 200:
                data = response.json()

                if data.get("action") == "OK" or data.get("flag") == "YES":
                    self.is_logged_in  = True
                    self.uid           = username

                    # Extract JWT token — could be in response body or headers
                    self.jwt_token = (
                        data.get("token") or
                        data.get("Token") or
                        data.get("access_token") or
                        response.headers.get("Token", "")
                    )

                    self.user_type     = data.get("ut") or data.get("user_type", "Learner")
                    # Cookies expire in 7 days (confirmed: Expires=Sun, 05 Apr 2026)
                    self.cookie_expiry = datetime.now().timestamp() + (7 * 24 * 60 * 60)

                    print(f"[LOGIN] Logged in as: {username}")
                    print(f"[LOGIN] JWT token: {'obtained' if self.jwt_token else 'not in body — check headers'}")

                    return {"success": True, "message": "Logged in successfully", "user_type": self.user_type}

                else:
                    msg = data.get("snackbar") or data.get("message") or "Invalid username or password"
                    return {"success": False, "message": msg}

            return {"success": False, "message": f"Server error {response.status_code}"}

        except httpx.RequestError as e:
            return {"success": False, "message": f"Network error: {e}"}


    # ── AUTHENTICATED HEADERS (with Token + Uid + Ut) ─────────────────────────
    def _auth_headers(self) -> dict:
        """
        Returns the extra headers VOLP requires for all authenticated requests.
        Confirmed from Image 4 (learnerCourseList request headers):
          Token: <jwt>
          Uid:   swaraj.1251070064@vit.edu
          Ut:    Learner
        """
        return {
            "Token": self.jwt_token,
            "Uid":   self.uid,
            "Ut":    self.user_type,
        }


    # ── STORE SESSION (what we save to DB — Option 2) ──────────────────────────
    def get_session_cookies(self) -> dict:
        """
        Returns everything needed to restore the session later.
        This is stored in the DB (encrypted). Password is NOT here.
        """
        return {
            "AWSALB":     self.http.cookies.get("AWSALB", ""),
            "AWSALBCORS": self.http.cookies.get("AWSALBCORS", ""),
            "jwt_token":  self.jwt_token,
            "uid":        self.uid,
            "user_type":  self.user_type,
            "expiry":     self.cookie_expiry,
        }


    # ── RESTORE SESSION FROM STORED COOKIES ───────────────────────────────────
    def restore_session(self, session: dict) -> bool:
        """
        Restores session from stored data without needing to log in again.
        Returns False if session has expired (need fresh login).
        """
        try:
            expiry = session.get("expiry", 0)
            if datetime.now().timestamp() > expiry:
                print("[SESSION] Expired — need fresh login")
                return False

            # Restore cookies
            self.http.cookies.set("AWSALB",     session["AWSALB"],     domain="learner.volp.in")
            self.http.cookies.set("AWSALBCORS",  session["AWSALBCORS"], domain="learner.volp.in")

            # Restore JWT token and user info
            self.jwt_token    = session["jwt_token"]
            self.uid          = session["uid"]
            self.user_type    = session.get("user_type", "Learner")
            self.cookie_expiry = expiry
            self.is_logged_in = True

            print(f"[SESSION] Restored for {self.uid}")
            return True

        except Exception as e:
            print(f"[SESSION] Restore failed: {e}")
            return False


    # ── GET ALL COURSES ────────────────────────────────────────────────────────
    async def get_courses(self) -> list:
        """
        Fetches enrolled courses. Uses the confirmed endpoint and auth headers.
        Returns clean list of course dicts.
        """
        if not self.is_logged_in:
            return []
        try:
            response = await self.http.post(
                COURSES_URL,
                json={},
                headers=self._auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                return [
                    {
                        "course_name":  item.get("code", ""),
                        "display_name": item.get("course", {}).get("course_name", ""),
                        "crsid":        item.get("crsid"),
                        "colid":        item.get("colid"),
                        "instructor":   item.get("inst", ""),
                        "description":  item.get("description", ""),
                        "is_active":    item.get("course_status", False),
                        "is_archived":  item.get("is_archived", False),
                        "last_seen":    item.get("lastseen", ""),
                        "progress":     item.get("progress", 0.0),
                        "asscnt":       item.get("asscnt", 0),
                    }
                    for item in data.get("col_list", [])
                ]
        except Exception as e:
            print(f"[ERROR] get_courses: {e}")
        return []


    # ── GET ASSIGNMENTS FOR A COURSE ───────────────────────────────────────────
    async def get_assignments(self, crsid: int, colid: int) -> list:
        """Fetches assignments for a specific course."""
        if not self.is_logged_in:
            return []
        try:
            response = await self.http.post(
                ASSIGNMENTS_URL,
                json={"crsid": crsid, "colid": colid},
                headers=self._auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in data.get("col_list", data.get("assignment_list", [])):
                    results.append({
                        "assignment_id":   item.get("assid") or item.get("id"),
                        "assignment_name": item.get("title") or item.get("name", ""),
                        "description":     item.get("description", ""),
                        "due_date":        item.get("end_date") or item.get("due_date", ""),
                        "start_date":      item.get("start_date", ""),
                        "is_submitted":    item.get("submitted", False),
                        "submission_date": item.get("submission_date"),
                        "max_marks":       item.get("max_marks") or item.get("marks", 0),
                        "crsid":           crsid,
                        "colid":           colid,
                    })
                return results
        except Exception as e:
            print(f"[ERROR] get_assignments({crsid}): {e}")
        return []


    # ── GET ANNOUNCEMENTS FOR A COURSE ─────────────────────────────────────────
    async def get_announcements(self, crsid: int, colid: int) -> list:
        """Fetches course announcements."""
        if not self.is_logged_in:
            return []
        try:
            response = await self.http.post(
                ANNOUNCEMENTS_URL,
                json={"crsid": crsid, "colid": colid},
                headers=self._auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in data.get("col_list", data.get("announcement_list", [])):
                    results.append({
                        "announcement_id": item.get("id") or item.get("annid"),
                        "title":           item.get("title", "No Title"),
                        "content":         item.get("description") or item.get("content", ""),
                        "posted_date":     item.get("created_at") or item.get("date", ""),
                        "crsid":           crsid,
                    })
                return results
        except Exception as e:
            print(f"[ERROR] get_announcements({crsid}): {e}")
        return []


    # ── GET MATERIALS FOR A COURSE ─────────────────────────────────────────────
    async def get_materials(self, crsid: int, colid: int) -> list:
        """Fetches uploaded study materials."""
        if not self.is_logged_in:
            return []
        try:
            response = await self.http.post(
                MATERIALS_URL,
                json={"crsid": crsid, "colid": colid},
                headers=self._auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in data.get("col_list", data.get("material_list", [])):
                    results.append({
                        "material_id":   item.get("id") or item.get("matid"),
                        "title":         item.get("title", ""),
                        "file_url":      item.get("file_url") or item.get("url", ""),
                        "file_type":     item.get("file_type", ""),
                        "uploaded_date": item.get("created_at") or item.get("date", ""),
                        "chapter":       item.get("chapter") or item.get("section", "General"),
                        "crsid":         crsid,
                    })
                return results
        except Exception as e:
            print(f"[ERROR] get_materials({crsid}): {e}")
        return []


    # ── FULL SYNC ──────────────────────────────────────────────────────────────
    async def full_sync(self) -> dict:
        """
        Fetches everything — courses, assignments, announcements, materials.
        Called by the scheduler every 15 minutes.
        """
        print("[SYNC] Starting full VOLP sync...")
        result = {
            "courses":       [],
            "assignments":   {},
            "announcements": {},
            "materials":     {},
            "synced_at":     datetime.now().isoformat()
        }

        courses = await self.get_courses()
        result["courses"] = courses
        print(f"[SYNC] {len(courses)} courses found")

        for course in courses:
            if not course["is_active"] or course["is_archived"]:
                continue

            crsid = course["crsid"]
            colid = course["colid"]
            key   = f"{crsid}_{colid}"
            name  = course["display_name"] or course["course_name"]

            print(f"[SYNC] → {name}")

            result["assignments"][key]   = await self.get_assignments(crsid, colid)
            result["announcements"][key] = await self.get_announcements(crsid, colid)
            result["materials"][key]     = await self.get_materials(crsid, colid)

        print(f"[SYNC] Complete at {result['synced_at']}")
        return result


    async def close(self):
        await self.http.aclose()