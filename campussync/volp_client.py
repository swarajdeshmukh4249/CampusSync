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


def _list_from_payload(data, *keys) -> list:
    """VOLP responses vary: col_list, nested data, or a raw list."""
    if isinstance(data, list):
        return data
    if not isinstance(data, dict):
        return []
    for key in keys:
        value = data.get(key)
        if isinstance(value, list):
            return value
    nested = data.get("data")
    if isinstance(nested, list):
        return nested
    if isinstance(nested, dict):
        for key in keys:
            value = nested.get(key)
            if isinstance(value, list):
                return value
    return []


def _truthy(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "active", "ok"}
    return bool(value)


def _person_name(value) -> str:
    if isinstance(value, dict):
        return (
            value.get("name")
            or value.get("instructor_name")
            or value.get("full_name")
            or value.get("fname")
            or ""
        )
    return str(value or "").strip()


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
        username = (username or "").strip()
        password = (password or "").strip()
        if not username or not password:
            return {"success": False, "message": "Username and password are required"}

        try:
            payload = {
                "username": username,
                "pwd":      password,   # confirmed field name from network tab
            }

            response = await self.http.post(LOGIN_URL, json=payload)

            if response.status_code == 200:
                data = response.json() if response.content else {}
                if not isinstance(data, dict):
                    return {"success": False, "message": "Unexpected response from VOLP"}

                flag = str(data.get("flag") or "").strip().upper()
                action = str(data.get("action") or "").strip().upper()
                token = (
                    data.get("token")
                    or data.get("Token")
                    or data.get("access_token")
                    or response.headers.get("Token", "")
                    or ""
                )

                # Success: explicit OK/YES, or a session token was returned
                if action == "OK" or flag == "YES" or (token and flag not in {"NO", "FALSE", "0"}):
                    self.is_logged_in  = True
                    self.uid           = username
                    self.jwt_token     = token
                    self.user_type     = data.get("ut") or data.get("user_type") or "Learner"
                    self.cookie_expiry = datetime.now().timestamp() + (7 * 24 * 60 * 60)

                    print(f"[LOGIN] Logged in as: {username}")
                    print(f"[LOGIN] JWT token: {'obtained' if self.jwt_token else 'missing'}")
                    print(f"[LOGIN] response keys: {sorted(data.keys())}")

                    if not self.jwt_token:
                        print("[LOGIN] Warning: no Token in body/headers — course sync may fail")

                    return {"success": True, "message": "Logged in successfully", "user_type": self.user_type}

                msg = (
                    data.get("snackbar")
                    or data.get("msg")
                    or data.get("message")
                    or "Invalid username or password"
                )
                print(f"[LOGIN] Rejected for {username!r}: flag={flag!r} action={action!r} msg={msg!r}")
                hint = ""
                if "@" not in username:
                    hint = " Use your full VOLP email (e.g. name.prn@vit.edu), not just your PRN."
                return {
                    "success": False,
                    "message": f"VOLP: {msg}.{hint} Sign in at classroom.volp.in with the same email/password to confirm.",
                }

            print(f"[LOGIN] HTTP {response.status_code}: {response.text[:300]}")
            return {"success": False, "message": f"VOLP server error {response.status_code}"}

        except httpx.RequestError as e:
            return {"success": False, "message": f"Network error reaching VOLP: {e}"}


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
                items = _list_from_payload(data, "col_list", "course_list", "courses")
                courses = []
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    course_obj = item.get("course") if isinstance(item.get("course"), dict) else {}
                    display = (
                        (course_obj or {}).get("course_name")
                        or (item.get("course") if isinstance(item.get("course"), str) else "")
                        or item.get("course_name")
                        or item.get("title")
                        or ""
                    )
                    courses.append({
                        "course_name":  item.get("code") or item.get("course_code") or "",
                        "display_name": display,
                        "crsid":        item.get("crsid") or item.get("course_id") or (course_obj or {}).get("crsid"),
                        "colid":        item.get("colid") or item.get("id"),
                        "instructor":   _person_name(item.get("inst") or item.get("instructor") or item.get("instructor_name")),
                        "description":  item.get("description", ""),
                        "is_active":    _truthy(item.get("course_status", True)),
                        "is_archived":  _truthy(item.get("is_archived", False)),
                        "last_seen":    item.get("lastseen", ""),
                        "progress":     item.get("progress", 0.0),
                        "asscnt":       item.get("asscnt") or item.get("assignment_count") or 0,
                    })
                return courses
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
                for item in _list_from_payload(data, "col_list", "assignment_list", "assignments"):
                    if not isinstance(item, dict):
                        continue
                    results.append({
                        "assignment_id":   item.get("assid") or item.get("id") or item.get("assignment_id"),
                        "assignment_name": item.get("title") or item.get("name") or item.get("assignment_name") or "Untitled assignment",
                        "description":     item.get("description", ""),
                        "due_date":        item.get("end_date") or item.get("due_date") or item.get("deadline") or "",
                        "start_date":      item.get("start_date", ""),
                        "is_submitted":    _truthy(item.get("submitted") or item.get("is_submitted") or item.get("isSubmitted")),
                        "submission_date": item.get("submission_date"),
                        "max_marks":       item.get("max_marks") or item.get("marks") or 0,
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
                for item in _list_from_payload(data, "col_list", "announcement_list", "announcements"):
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
                for item in _list_from_payload(data, "col_list", "material_list", "materials"):
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
            if course.get("is_archived"):
                continue
            crsid = course.get("crsid")
            colid = course.get("colid")
            if crsid is None or colid is None:
                continue

            key  = f"{crsid}_{colid}"
            name = course.get("display_name") or course.get("course_name") or key
            print(f"[SYNC] → {name}")

            result["assignments"][key]   = await self.get_assignments(crsid, colid)
            result["announcements"][key] = await self.get_announcements(crsid, colid)
            result["materials"][key]     = await self.get_materials(crsid, colid)

        print(f"[SYNC] Complete at {result['synced_at']}")
        return result


    async def submit_assignment(self, crsid: int, colid: int, assignment_id, file_path: str, filename: str) -> dict:
        """
        Best-effort VOLP submit. Endpoint names vary; we try the dashboard submit URL.
        Returns {success, message}.
        """
        if not self.is_logged_in:
            return {"success": False, "message": "Not logged in to VOLP"}
        url = "https://learner.volp.in/learnerCourseDashboard/learnerAssignmentSubmit"
        try:
            # Multipart upload — strip JSON Content-Type from the shared client headers
            headers = {k: v for k, v in self._auth_headers().items()}
            with open(file_path, "rb") as f:
                files = {"file": (filename, f)}
                data = {"crsid": str(crsid), "colid": str(colid), "assid": str(assignment_id)}
                # httpx merges client.headers; unset Content-Type so boundary is set correctly
                response = await self.http.post(
                    url,
                    data=data,
                    files=files,
                    headers={**headers, "Content-Type": None},  # type: ignore[dict-item]
                )
            if response.status_code == 200:
                body = {}
                try:
                    body = response.json()
                except Exception:
                    pass
                ok = body.get("action") == "OK" or body.get("flag") == "YES" or body.get("success") is True
                if ok or not body:
                    return {"success": True if ok else False, "message": body.get("message") or response.text[:200]}
                return {"success": False, "message": body.get("snackbar") or body.get("message") or "VOLP rejected the submit"}
            return {"success": False, "message": f"VOLP submit failed ({response.status_code})"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def close(self):
        await self.http.aclose()