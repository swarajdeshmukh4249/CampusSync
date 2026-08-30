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
from urllib.parse import urljoin, urlparse


# ─── VOLP API Endpoints (confirmed from network inspection) ────────────────────
LOGIN_URL         = "https://admin.volp.in/login/process"
COURSES_URL       = "https://learner.volp.in/learnerCourseDashboard/learnerCourseList"
ASSIGNMENTS_URL   = "https://learner.volp.in/learnerCourseDashboard/learnerAssignmentList"
MATERIALS_URL     = "https://learner.volp.in/learnerCourseDashboard/learnerMaterialList"
ANNOUNCEMENTS_URL = "https://learner.volp.in/learnerCourseDashboard/learnerAnnouncementList"

# New assignment type endpoints
OBJECTIVE_ASSIGNMENTS_URL = "https://learner.volp.in/LearnerCourse/getassignmentdetails"
SUBJECTIVE_ASSIGNMENTS_URL = "https://learner.volp.in/SubjectiveAssignment/getSubjectiveAssignment_new"
HANDSON_ASSIGNMENTS_URL = "https://learner.volp.in/HandOnAssignment/getHandsOnDetails"
TESTS_URL = "https://learner.volp.in/learnerCourse/testList"
COURSE_CONTENT_URL = "https://learner.volp.in/learnerCourseContent/courseContentData"

# Course Content is where many instructors place assignments and handouts.  The
# deployed VOLP installations do not all expose it under the same controller,
# so try the known learner routes and accept the one that returns content.
COURSE_CONTENT_URLS = (
    "https://learner.volp.in/learnerCourseContent/learnerCourseContentList",
    "https://learner.volp.in/learnerCourseDashboard/learnerCourseContentList",
    "https://learner.volp.in/learnerCourseContent/learnerContentList",
)

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


_INACTIVE_COURSE_STATUSES = {"inactive", "disabled", "expired", "completed", "closed", "archived"}
_ARCHIVED_COURSE_STATUSES = {"archived", "closed"}
_SUBMITTED_STATUSES = {"submitted", "completed", "done", "graded", "evaluated", "turned in"}
_NOT_SUBMITTED_STATUSES = {"0", "false", "no", "n", "pending", "not submitted", "incomplete", "draft", "open"}


def _is_submitted(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        v = value.strip().lower()
        if v in _NOT_SUBMITTED_STATUSES:
            return False
        if v in _SUBMITTED_STATUSES or v in {"1", "true", "yes", "y", "active", "ok"}:
            return True
    return bool(value)


def _extract_due_date(item: dict):
    for key in (
        "dueDate", "endDate", "end_date", "due_date", "deadline",
        "submission_end_date", "submissionEndDate", "lastDate", "last_date",
    ):
        val = item.get(key)
        if val is not None and val != "":
            return val
    return ""


def _extract_submitted(item: dict) -> bool:
    for key in (
        "isSubmitted", "is_submitted", "submitted", "isCompleted", "is_completed",
        "submissionStatus", "submission_status", "submitStatus", "submit_status",
    ):
        val = item.get(key)
        if val is not None and val != "":
            return _is_submitted(val)
    status = str(item.get("status") or "").strip().lower()
    if status in _SUBMITTED_STATUSES:
        return True
    return False


def _course_flags(item: dict) -> tuple[bool, bool]:
    """Return (is_active, is_archived) from VOLP's varying status fields."""
    status = str(item.get("status") or "").strip().lower()
    is_archived = _truthy(item.get("is_archived")) or status in _ARCHIVED_COURSE_STATUSES
    course_status = item.get("course_status")
    inactive = (
        is_archived
        or status in _INACTIVE_COURSE_STATUSES
        or (course_status is not None and not _truthy(course_status))
    )
    return (not inactive, is_archived)


def is_active_course(course: dict) -> bool:
    if not isinstance(course, dict):
        return False
    if course.get("is_archived"):
        return False
    return bool(course.get("is_active", True))


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


def _text(value) -> str:
    """Return a useful string without accidentally rendering a dict/list."""
    return value.strip() if isinstance(value, str) else ""


def _first_text(item: dict, *keys) -> str:
    for key in keys:
        value = _text(item.get(key))
        if value:
            return value
    return ""


def _file_url(item: dict) -> str:
    """Find a teacher attachment despite VOLP's varying field names."""
    for key in ("file_url", "fileUrl", "download_url", "downloadUrl", "attachment_url",
                "attachmentUrl", "document_url", "documentUrl", "file_path", "filePath",
                "filepath", "file", "attachment", "url", "link"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict):
            nested = _file_url(value)
            if nested:
                return nested
    return ""


def _content_nodes(payload, section: str = ""):
    """Yield every object in a Course Content tree along with its folder title."""
    if isinstance(payload, list):
        for value in payload:
            yield from _content_nodes(value, section)
        return
    if not isinstance(payload, dict):
        return

    title = _first_text(payload, "section", "chapter", "module_name", "module", "folder_name",
                        "content_name", "topic", "name", "title")
    next_section = title or section
    yield payload, section
    for value in payload.values():
        if isinstance(value, (dict, list)):
            yield from _content_nodes(value, next_section)


def _content_type(item: dict) -> str:
    return " ".join(
        str(item.get(key) or "")
        for key in ("type", "content_type", "contentType", "item_type", "itemType", "category")
    ).lower()


def _normalise_assignment(item: dict, crsid, colid, section: str) -> Optional[dict]:
    kind = _content_type(item)
    assignment_id = item.get("assid") or item.get("assignment_id") or item.get("assignmentId")
    if not assignment_id and "assignment" not in kind:
        return None
    assignment_id = assignment_id or item.get("id") or item.get("content_id")
    if assignment_id is None:
        return None
    return {
        "assignment_id": assignment_id,
        "assignment_name": _first_text(item, "assignment_name", "assignmentName", "title", "name", "content_name") or "Untitled assignment",
        "description": _first_text(item, "description", "content", "instructions"),
        "due_date": _extract_due_date(item),
        "start_date": item.get("start_date") or item.get("startDate") or item.get("submission_start_date") or "",
        "is_submitted": _extract_submitted(item),
        "submission_date": item.get("submission_date"),
        "max_marks": item.get("max_marks") or item.get("marks") or item.get("maximum_marks") or 0,
        "section": section or "Course Content",
        "crsid": crsid,
        "colid": colid,
    }


def _normalise_material(item: dict, crsid, colid, section: str) -> Optional[dict]:
    kind = _content_type(item)
    url = _file_url(item)
    if not url and not any(word in kind for word in ("material", "file", "document", "attachment", "resource")):
        return None
    material_id = item.get("matid") or item.get("material_id") or item.get("materialId") or item.get("content_id") or item.get("id")
    title = _first_text(item, "material_name", "materialName", "title", "name", "content_name", "file_name", "filename")
    if material_id is None and not (url or title):
        return None
    return {
        # A stable fallback means a file without VOLP's matid is still visible
        # and does not generate a duplicate notification at every sync.
        "material_id": material_id or f"{section}|{title}|{url}",
        "title": title or "Study material",
        "file_url": url,
        "file_type": _first_text(item, "file_type", "fileType", "mime_type", "mimeType", "extension"),
        "uploaded_date": item.get("created_at") or item.get("uploaded_date") or item.get("date") or "",
        "chapter": section or _first_text(item, "chapter", "section") or "Course Content",
        "crsid": crsid,
        "colid": colid,
    }


def _merge_items(*lists: list, id_key: str) -> list:
    """Keep one copy when an item appears in both dashboard and content APIs."""
    merged, seen = [], set()
    for values in lists:
        for item in values:
            if not isinstance(item, dict):
                continue
            identity = str(item.get(id_key) or "")
            if not identity:
                identity = json.dumps(item, sort_keys=True, default=str)
            if identity not in seen:
                seen.add(identity)
                merged.append(item)
    return merged


def _merge_assignment_records(existing: dict, new: dict) -> dict:
    """Combine two assignment records, preferring richer due-date and submission data."""
    result = existing.copy()
    for key, val in new.items():
        if key == "due_date":
            if val and not result.get("due_date"):
                result["due_date"] = val
        elif key == "is_submitted":
            if val:
                result["is_submitted"] = True
        elif key == "is_placeholder":
            if not val:
                result.pop("is_placeholder", None)
        elif key in (
            "submission_date", "assignment_name", "description", "max_marks",
            "assignment_type", "start_date", "section",
        ):
            if val and not result.get(key):
                result[key] = val
        elif key not in result or result[key] in (None, "", 0):
            if val not in (None, ""):
                result[key] = val
    return result


def _merge_assignments(*lists: list) -> list:
    """Merge assignment records from multiple VOLP endpoints by assignment_id."""
    by_id: dict[str, dict] = {}
    for values in lists:
        for item in values:
            if not isinstance(item, dict):
                continue
            identity = str(item.get("assignment_id") or "")
            if not identity:
                continue
            if identity not in by_id:
                by_id[identity] = item.copy()
            else:
                by_id[identity] = _merge_assignment_records(by_id[identity], item)
    return list(by_id.values())


def _extract_assignment_ids(content_data: dict) -> dict:
    """Extract assignment IDs from course content data structure.

    Returns dict mapping assignment types to lists of IDs:
    {
        "hands": [72351, 72353, ...],
        "mcq": [123, 456, ...],
        "swa": [789, ...],
        "mwa": [...],
        "proj": [...],
        "cie": [...],
        "mtf": [...]
    }
    """
    assignment_ids = {
        "hands": [], "mcq": [], "swa": [], "mwa": [], "proj": [], "cie": [], "mtf": []
    }

    if not isinstance(content_data, dict):
        return assignment_ids

    # Extract from course level
    course_level = content_data.get("course_level", {})
    if isinstance(course_level, dict):
        course_assigns = course_level.get("assigns", {})
        if isinstance(course_assigns, dict):
            for key in assignment_ids.keys():
                if key in course_assigns and isinstance(course_assigns[key], list):
                    assignment_ids[key].extend(course_assigns[key])

    # Extract from unit level
    unit_level = content_data.get("unit_level", [])
    if isinstance(unit_level, list):
        for unit in unit_level:
            if isinstance(unit, dict):
                unit_assigns = unit.get("assigns", {})
                if isinstance(unit_assigns, dict):
                    for key in assignment_ids.keys():
                        if key in unit_assigns and isinstance(unit_assigns[key], list):
                            assignment_ids[key].extend(unit_assigns[key])

                # Also check topic level
                topic_level = unit.get("topic_level", [])
                if isinstance(topic_level, list):
                    for topic in topic_level:
                        if isinstance(topic, dict):
                            topic_assigns = topic.get("assigns", {})
                            if isinstance(topic_assigns, dict):
                                for key in assignment_ids.keys():
                                    if key in topic_assigns and isinstance(topic_assigns[key], list):
                                        assignment_ids[key].extend(topic_assigns[key])

    print(f"[EXTRACT] Total assignment IDs: hands={len(assignment_ids['hands'])}, proj={len(assignment_ids['proj'])}, mcq={len(assignment_ids['mcq'])}, swa={len(assignment_ids['swa'])}")
    return assignment_ids


def _create_placeholder_assignments(assignment_ids: dict, crsid: int, colid: int, course_name: str) -> list:
    """Create placeholder assignments from assignment IDs when detail endpoints fail.

    This allows us to at least show that assignments exist even if we can't get full details.
    """
    placeholders = []

    type_mapping = {
        "hands": "Hands-On Assignment",
        "mcq": "Objective Assignment",
        "swa": "Subjective Assignment",
        "mwa": "Manual Written Assignment",
        "proj": "Project",
        "cie": "Continuous Internal Evaluation",
        "mtf": "Match The Following"
    }

    for assign_type, ids in assignment_ids.items():
        if not ids:
            continue

        type_name = type_mapping.get(assign_type, "Assignment")
        for assign_id in ids:
            placeholders.append({
                "assignment_id": str(assign_id),
                "assignment_name": f"{type_name} #{assign_id}",
                "description": f"View details on VOLP classroom",
                "due_date": None,  # Changed from empty string to None for better handling
                "start_date": None,
                "is_submitted": False,
                "submission_date": None,
                "max_marks": 0,
                "assignment_type": assign_type,
                "crsid": crsid,
                "colid": colid,
                "course_name": course_name,
                "is_placeholder": True  # Flag to indicate this is a placeholder
            })

    print(f"[PLACEHOLDER] Created {len(placeholders)} placeholder assignments")
    return placeholders


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
        self.vue_session_key: str = ""  # Bearer token for new endpoints
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
                    self.vue_session_key = token  # Use same token as Bearer for new endpoints
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

    # ── BEARER AUTH HEADERS (for new endpoints) ───────────────────────────────
    def _bearer_auth_headers(self) -> dict:
        """
        Returns Bearer token authorization for new assignment endpoints.
        Based on vue-session-key from localStorage.
        """
        return {
            "Authorization": f"Bearer {self.vue_session_key}",
            "Content-Type": "application/json",
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
            "vue_session_key": self.vue_session_key,
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
            self.vue_session_key = session.get("vue_session_key", self.jwt_token)
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
                    is_active, is_archived = _course_flags(item)
                    courses.append({
                        "course_name":  item.get("code") or item.get("course_code") or "",
                        "display_name": display,
                        "crsid":        item.get("crsid") or item.get("course_id") or (course_obj or {}).get("crsid"),
                        "colid":        item.get("colid") or item.get("id"),
                        "instructor":   _person_name(item.get("inst") or item.get("instructor") or item.get("instructor_name")),
                        "description":  item.get("description", ""),
                        "is_active":    is_active,
                        "is_archived":  is_archived,
                        "status":       item.get("status") or item.get("course_status") or "",
                        "last_seen":    item.get("lastseen", ""),
                        "progress":     item.get("progress", 0.0),
                        "asscnt":       item.get("asscnt") or item.get("assignment_count") or 0,
                    })
                return courses
        except Exception as e:
            print(f"[ERROR] get_courses: {e}")
        return []


    # ── GET ASSIGNMENTS FOR A COURSE ───────────────────────────────────────────
    async def get_assignments(self, crsid: int, colid: int, include_content: bool = True) -> list:
        """Fetch assignments from the dashboard list and every Course Content section."""
        if not self.is_logged_in:
            return []
        results = []
        try:
            response = await self.http.post(
                ASSIGNMENTS_URL,
                json={"crsid": crsid, "colid": colid},
                headers=self._auth_headers()
            )
            print(f"[ASSIGNMENTS] Dashboard endpoint response status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"[ASSIGNMENTS] Dashboard response keys: {list(data.keys())}")
                print(f"[ASSIGNMENTS] Dashboard full response: {data}")
                for item in _list_from_payload(data, "col_list", "assignment_list", "assignments"):
                    if not isinstance(item, dict):
                        continue
                    results.append({
                        "assignment_id":   item.get("assid") or item.get("id") or item.get("assignment_id"),
                        "assignment_name": item.get("title") or item.get("name") or item.get("assignment_name") or "Untitled assignment",
                        "description":     item.get("description", ""),
                        "due_date":        _extract_due_date(item),
                        "start_date":      item.get("start_date") or item.get("startDate") or "",
                        "is_submitted":    _extract_submitted(item),
                        "submission_date": item.get("submission_date"),
                        "max_marks":       item.get("max_marks") or item.get("marks") or 0,
                        "crsid":           crsid,
                        "colid":           colid,
                    })
            else:
                print(f"[ASSIGNMENTS] Dashboard endpoint returned status {response.status_code}: {response.text[:200]}")
        except Exception as e:
            print(f"[ERROR] get_assignments({crsid}): {e}")
        content_assignments = []
        if include_content:
            content_assignments, _ = await self.get_course_content(crsid, colid)
        print(f"[ASSIGNMENTS] Total results: {len(results)}, Content assignments: {len(content_assignments)}")
        return _merge_assignments(results, content_assignments)


    async def get_course_content(self, crsid: int, colid: int) -> tuple[list, list]:
        """Discover assignments and files nested under all Course Content folders.

        Instructors can put an assignment in any module/folder, so this walks the
        whole response rather than relying on a course-wide assignment counter.
        """
        if not self.is_logged_in:
            return [], []

        assignments, materials = [], []
        payload = {"crsid": crsid, "colid": colid}
        for url in COURSE_CONTENT_URLS:
            try:
                response = await self.http.post(url, json=payload, headers=self._auth_headers())
                if response.status_code != 200 or not response.content:
                    continue
                data = response.json()
            except (httpx.HTTPError, ValueError) as e:
                print(f"[CONTENT] {url.rsplit('/', 1)[-1]} unavailable for {crsid}: {e}")
                continue

            for item, section in _content_nodes(data):
                assignment = _normalise_assignment(item, crsid, colid, section)
                if assignment:
                    assignments.append(assignment)
                material = _normalise_material(item, crsid, colid, section)
                if material:
                    materials.append(material)

        return (
            _merge_assignments(assignments),
            _merge_items(materials, id_key="material_id"),
        )


    # ── NEW ASSIGNMENT TYPE ENDPOINTS ───────────────────────────────────────────
    async def get_objective_assignments(self, crsid: int, colid: int, assignment_ids: list = None) -> list:
        """Fetch objective assignments using the new endpoint."""
        if not self.is_logged_in:
            return []
        results = []
        try:
            # If no specific IDs provided, try to get all with assignmentId: 0
            ids_to_fetch = assignment_ids if assignment_ids else [0]
            for assignment_id in ids_to_fetch:
                payload = {
                    "courseId": colid,  # colid is used as courseId
                    "batchId": 0,
                    "assignmentId": assignment_id
                }
                response = await self.http.post(
                    OBJECTIVE_ASSIGNMENTS_URL,
                    json=payload,
                    headers=self._bearer_auth_headers()
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in _list_from_payload(data, "data", "assignments", "assignmentList"):
                        if not isinstance(item, dict):
                            continue
                        results.append({
                            "assignment_id":   item.get("assignmentId") or item.get("id"),
                            "assignment_name": item.get("title") or item.get("assignmentName") or "Objective Assignment",
                            "description":     item.get("description", ""),
                            "due_date":        _extract_due_date(item),
                            "start_date":      item.get("startDate") or "",
                            "is_submitted":    _extract_submitted(item),
                            "submission_date": item.get("submissionDate"),
                            "max_marks":       item.get("maxMarks") or item.get("totalMarks") or 0,
                            "assignment_type": "objective",
                            "crsid":           crsid,
                            "colid":           colid,
                        })
        except Exception as e:
            print(f"[ERROR] get_objective_assignments({crsid}): {e}")
        return results


    async def get_subjective_assignments(self, crsid: int, colid: int, assignment_ids: list = None) -> list:
        """Fetch subjective assignments using the new endpoint."""
        if not self.is_logged_in:
            return []
        results = []
        try:
            ids_to_fetch = assignment_ids if assignment_ids else [0]
            for assignment_id in ids_to_fetch:
                payload = {
                    "courseId": colid,
                    "studentId": self.uid,
                    "assignmentId": assignment_id
                }
                response = await self.http.post(
                    SUBJECTIVE_ASSIGNMENTS_URL,
                    json=payload,
                    headers=self._bearer_auth_headers()
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in _list_from_payload(data, "data", "assignments", "assignmentList"):
                        if not isinstance(item, dict):
                            continue
                        results.append({
                            "assignment_id":   item.get("assignmentId") or item.get("id"),
                            "assignment_name": item.get("title") or item.get("assignmentName") or "Subjective Assignment",
                            "description":     item.get("description") or item.get("question", ""),
                            "due_date":        _extract_due_date(item),
                            "start_date":      item.get("startDate") or "",
                            "is_submitted":    _extract_submitted(item),
                            "submission_date": item.get("submissionDate"),
                            "max_marks":       item.get("maxMarks") or item.get("totalMarks") or 0,
                            "assignment_type": "subjective",
                            "crsid":           crsid,
                            "colid":           colid,
                        })
        except Exception as e:
            print(f"[ERROR] get_subjective_assignments({crsid}): {e}")
        return results


    async def get_hands_on_assignments(self, crsid: int, colid: int, assignment_ids: list = None) -> list:
        """Fetch hands-on assignments using the new endpoint."""
        if not self.is_logged_in:
            return []
        results = []
        try:
            ids_to_fetch = assignment_ids if assignment_ids else []
            # If no IDs provided, try the general endpoint
            if not ids_to_fetch:
                payload = {
                    "courseId": colid,
                    "studentId": self.uid
                }
                response = await self.http.post(
                    HANDSON_ASSIGNMENTS_URL,
                    json=payload,
                    headers=self._bearer_auth_headers()
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in _list_from_payload(data, "data", "assignments", "handsOnList"):
                        if not isinstance(item, dict):
                            continue
                        results.append({
                            "assignment_id":   item.get("handsOnId") or item.get("id") or item.get("assignmentId"),
                            "assignment_name": item.get("title") or item.get("handsOnName") or "Hands-On Assignment",
                            "description":     item.get("description") or "",
                            "due_date":        _extract_due_date(item),
                            "start_date":      item.get("startDate") or "",
                            "is_submitted":    _extract_submitted(item),
                            "submission_date": item.get("submissionDate"),
                            "max_marks":       item.get("maxMarks") or item.get("totalMarks") or 0,
                            "assignment_type": "hands_on",
                            "crsid":           crsid,
                            "colid":           colid,
                        })
            else:
                # Fetch specific assignments by ID
                for assignment_id in ids_to_fetch:
                    payload = {
                        "courseId": colid,
                        "studentId": self.uid,
                        "handsOnId": assignment_id
                    }
                    # Try with old auth headers first
                    response = await self.http.post(
                        HANDSON_ASSIGNMENTS_URL,
                        json=payload,
                        headers=self._auth_headers()
                    )
                    print(f"[HANDSON] Assignment ID {assignment_id}: Status {response.status_code} (old auth)")
                    if response.status_code == 200:
                        data = response.json()
                        print(f"[HANDSON] Assignment ID {assignment_id}: Response keys {list(data.keys())}")
                        if data.get("status") != "401":
                            print(f"[HANDSON] Assignment ID {assignment_id}: Full response {data}")
                            for item in _list_from_payload(data, "data", "assignments", "handsOnList"):
                                if not isinstance(item, dict):
                                    continue
                                results.append({
                                    "assignment_id":   item.get("handsOnId") or item.get("id") or item.get("assignmentId"),
                                    "assignment_name": item.get("title") or item.get("handsOnName") or "Hands-On Assignment",
                                    "description":     item.get("description") or "",
                                    "due_date":        _extract_due_date(item),
                                    "start_date":      item.get("startDate") or "",
                                    "is_submitted":    _extract_submitted(item),
                                    "submission_date": item.get("submissionDate"),
                                    "max_marks":       item.get("maxMarks") or item.get("totalMarks") or 0,
                                    "assignment_type": "hands_on",
                                    "crsid":           crsid,
                                    "colid":           colid,
                                })
                        else:
                            # Try with Bearer auth if old auth fails
                            print(f"[HANDSON] Assignment ID {assignment_id}: Old auth failed, trying Bearer auth")
                            response_bearer = await self.http.post(
                                HANDSON_ASSIGNMENTS_URL,
                                json=payload,
                                headers=self._bearer_auth_headers()
                            )
                            if response_bearer.status_code == 200:
                                data_bearer = response_bearer.json()
                                print(f"[HANDSON] Assignment ID {assignment_id}: Bearer auth response {data_bearer}")
                                for item in _list_from_payload(data_bearer, "data", "assignments", "handsOnList"):
                                    if not isinstance(item, dict):
                                        continue
                                    results.append({
                                        "assignment_id":   item.get("handsOnId") or item.get("id") or item.get("assignmentId"),
                                        "assignment_name": item.get("title") or item.get("handsOnName") or "Hands-On Assignment",
                                        "description":     item.get("description") or "",
                                        "due_date":        _extract_due_date(item),
                                        "start_date":      item.get("startDate") or "",
                                        "is_submitted":    _extract_submitted(item),
                                        "submission_date": item.get("submissionDate"),
                                        "max_marks":       item.get("maxMarks") or item.get("totalMarks") or 0,
                                        "assignment_type": "hands_on",
                                        "crsid":           crsid,
                                        "colid":           colid,
                                    })
                    else:
                        print(f"[HANDSON] Assignment ID {assignment_id}: Error response {response.text[:200]}")
        except Exception as e:
            print(f"[ERROR] get_hands_on_assignments({crsid}): {e}")
        return results


    async def get_tests(self, crsid: int, colid: int) -> list:
        """Fetch tests/assessments using the new endpoint."""
        if not self.is_logged_in:
            return []
        try:
            payload = {
                "crsid": crsid,
                "colid": colid
            }
            response = await self.http.post(
                TESTS_URL,
                json=payload,
                headers=self._auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in _list_from_payload(data, "data", "tests", "testList"):
                    if not isinstance(item, dict):
                        continue
                    results.append({
                        "assignment_id":   item.get("testId") or item.get("id"),
                        "assignment_name": item.get("title") or item.get("testName") or "Test/Assessment",
                        "description":     item.get("description", ""),
                        "due_date":        _extract_due_date(item) or item.get("scheduledDate") or "",
                        "start_date":      item.get("startDate") or item.get("scheduledDate") or "",
                        "is_submitted":    _extract_submitted(item),
                        "submission_date": item.get("completionDate"),
                        "max_marks":       item.get("maxMarks") or item.get("totalMarks") or 0,
                        "assignment_type": "test",
                        "crsid":           crsid,
                        "colid":           colid,
                    })
                return results
        except Exception as e:
            print(f"[ERROR] get_tests({crsid}): {e}")
        return []


    async def get_course_content_data(self, crsid: int, colid: int) -> dict:
        """Fetch course content hierarchy using the new endpoint."""
        if not self.is_logged_in:
            return {}
        try:
            payload = {
                "crsid": crsid,
                "colid": colid
            }
            response = await self.http.post(
                COURSE_CONTENT_URL,
                json=payload,
                headers=self._auth_headers()
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"[ERROR] get_course_content_data({crsid}): {e}")
        return {}


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
    async def get_materials(self, crsid: int, colid: int, include_content: bool = True) -> list:
        """Fetch teacher files from the material list and Course Content folders."""
        if not self.is_logged_in:
            return []
        results = []
        try:
            response = await self.http.post(
                MATERIALS_URL,
                json={"crsid": crsid, "colid": colid},
                headers=self._auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                for item in _list_from_payload(data, "col_list", "material_list", "materials"):
                    results.append({
                        "material_id":   item.get("id") or item.get("matid"),
                        "title":         item.get("title", ""),
                        "file_url":      item.get("file_url") or item.get("url", ""),
                        "file_type":     item.get("file_type", ""),
                        "uploaded_date": item.get("created_at") or item.get("date", ""),
                        "chapter":       item.get("chapter") or item.get("section") or "General",
                        "crsid":         crsid,
                        "colid":         colid,
                    })
        except Exception as e:
            print(f"[ERROR] get_materials({crsid}): {e}")
        content_materials = []
        if include_content:
            _, content_materials = await self.get_course_content(crsid, colid)
        return _merge_items(results, content_materials, id_key="material_id")


    async def download_material(self, file_url: str) -> tuple[bytes, str, str]:
        """Fetch a synced teacher file using the student's restored VOLP session."""
        url = urljoin("https://learner.volp.in/", file_url)
        parsed = urlparse(url)
        allowed_host = parsed.hostname and (
            parsed.hostname.endswith(".volp.in") or parsed.hostname.endswith(".amazonaws.com")
        )
        if parsed.scheme != "https" or not allowed_host:
            raise ValueError("VOLP returned an unsafe material link")
        response = await self.http.get(url, headers=self._auth_headers())
        response.raise_for_status()
        return (
            response.content,
            response.headers.get("content-type", "application/octet-stream"),
            response.headers.get("content-disposition", ""),
        )


    # ── FULL SYNC ──────────────────────────────────────────────────────────────
    async def full_sync(self) -> dict:
        """
        Fetches everything — courses, assignments (all types), announcements, materials.
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
        active_courses = [c for c in courses if is_active_course(c)]
        result["courses"] = active_courses
        print(f"[SYNC] {len(active_courses)} active courses ({len(courses) - len(active_courses)} archived/inactive skipped)")

        for course in active_courses:
            crsid = course.get("crsid")
            colid = course.get("colid")
            if crsid is None or colid is None:
                continue

            key  = f"{crsid}_{colid}"
            name = course.get("display_name") or course.get("course_name") or key
            print(f"[SYNC] → {name}")

            # Fetch course content data to get assignment IDs
            content_data = await self.get_course_content_data(crsid, colid)
            assignment_ids = _extract_assignment_ids(content_data)

            print(f"[SYNC]   Assignment IDs found: hands={len(assignment_ids['hands'])}, proj={len(assignment_ids['proj'])}, mcq={len(assignment_ids['mcq'])}, swa={len(assignment_ids['swa'])}")

            # Fetch all assignment types using extracted IDs
            dashboard_assignments = await self.get_assignments(crsid, colid, include_content=True)
            objective_assignments = await self.get_objective_assignments(crsid, colid, assignment_ids.get("mcq", []))
            subjective_assignments = await self.get_subjective_assignments(crsid, colid, assignment_ids.get("swa", []))
            hands_on_assignments = await self.get_hands_on_assignments(crsid, colid, assignment_ids.get("hands", []))
            tests = await self.get_tests(crsid, colid)

            # Fetch Course Content for nested assignments and materials
            content_assignments, content_materials = await self.get_course_content(crsid, colid)
            dashboard_materials = await self.get_materials(crsid, colid, include_content=False)

            print(f"[SYNC]   Dashboard assignments: {len(dashboard_assignments)}, Content assignments: {len(content_assignments)}")

            # Merge all assignment types
            all_assignments = _merge_assignments(
                dashboard_assignments,
                objective_assignments,
                subjective_assignments,
                hands_on_assignments,
                tests,
                content_assignments,
            )

            # Only create placeholders if we have assignment IDs but NO real assignments at all
            # This prevents showing incomplete placeholder data when we have some real data
            if not all_assignments and any(assignment_ids.values()):
                print(f"[SYNC]   No detailed assignments found, creating placeholders from IDs")
                placeholder_assignments = _create_placeholder_assignments(assignment_ids, crsid, colid, name)
                all_assignments.extend(placeholder_assignments)

            result["assignments"][key] = all_assignments

            result["announcements"][key] = await self.get_announcements(crsid, colid)
            result["materials"][key] = _merge_items(
                dashboard_materials, content_materials, id_key="material_id"
            )

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
