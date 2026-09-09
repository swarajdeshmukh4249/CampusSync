"""
CampusSync - Deadline & Change Detector
----------------------------------------
Compares previous sync data with new sync data.
Detects:
  • New assignments added
  • New announcements posted
  • Deadlines approaching (20 min, 1hr, 6hr, 24hr)
  • New materials uploaded
  • Submission status changes
"""

from datetime import datetime, timedelta
from typing import Optional


class DeadlineDetector:
    """
    Takes OLD data and NEW data from VOLP sync.
    Returns a list of events/alerts to send to the student.
    """

    # How many minutes before deadline to send reminders
    REMINDER_WINDOWS = [
        (24 * 60, "24 hours"),   # 24 hours before
        (6  * 60, "6 hours"),    # 6 hours before
        (60,      "1 hour"),     # 1 hour before
        (20,      "20 minutes"), # 20 minutes before ← the main one
    ]

    def detect_changes(
        self, old_data: dict, new_data: dict, reminder_minutes: Optional[int] = None
    ) -> list:
        """
        Main function. Returns list of alert dicts.
        
        Each alert looks like:
        {
            "type": "new_assignment" | "new_announcement" | 
                    "deadline_approaching" | "new_material" | "submitted",
            "title": "New Assignment: Lab Report 3",
            "body":  "Due in 20 minutes! (11:59 PM tonight)",
            "course": "Data Analysis",
            "urgency": "high" | "medium" | "low",
            "data": { ...extra info... }
        }
        """
        alerts = []

        # 1. Detect new assignments
        alerts += self._detect_new_assignments(old_data, new_data)

        # 2. Detect new announcements
        alerts += self._detect_new_announcements(old_data, new_data)

        # 3. Detect approaching deadlines
        alerts += self._detect_approaching_deadlines(new_data, reminder_minutes)

        # 4. Detect new materials
        alerts += self._detect_new_materials(old_data, new_data)

        return alerts


    # ── NEW ASSIGNMENTS ────────────────────────────────────────────────────────
    def _detect_new_assignments(self, old_data: dict, new_data: dict) -> list:
        alerts = []

        old_assignments = old_data.get("assignments", {})
        new_assignments = new_data.get("assignments", {})

        for key, new_list in new_assignments.items():
            old_list = old_assignments.get(key, [])

            # Get IDs of assignments we already knew about
            old_ids = {a["assignment_id"] for a in old_list if a.get("assignment_id")}

            for assignment in new_list:
                if assignment.get("assignment_id") not in old_ids:
                    # This is a NEW assignment!
                    due = self._parse_date(assignment.get("due_date", ""))
                    due_str = self._format_due_date(due) if due else "No deadline set"

                    # Find course name
                    course_name = self._get_course_name(key, new_data)

                    alerts.append({
                        "type":    "new_assignment",
                        "title":   f"📚 New Assignment: {assignment['assignment_name']}",
                        "body":    f"{course_name} • Due: {due_str}",
                        "course":  course_name,
                        "urgency": self._get_urgency(due),
                        "data":    assignment
                    })

        return alerts


    # ── NEW ANNOUNCEMENTS ──────────────────────────────────────────────────────
    def _detect_new_announcements(self, old_data: dict, new_data: dict) -> list:
        alerts = []

        old_ann = old_data.get("announcements", {})
        new_ann = new_data.get("announcements", {})

        for key, new_list in new_ann.items():
            old_list = old_ann.get(key, [])
            old_ids  = {a["announcement_id"] for a in old_list if a.get("announcement_id")}

            for ann in new_list:
                if ann.get("announcement_id") not in old_ids:
                    course_name = self._get_course_name(key, new_data)

                    alerts.append({
                        "type":    "new_announcement",
                        "title":   f"📢 New Announcement: {ann['title']}",
                        "body":    f"{course_name} • {ann.get('content', '')[:100]}...",
                        "course":  course_name,
                        "urgency": "medium",
                        "data":    ann
                    })

        return alerts


    # ── APPROACHING DEADLINES ──────────────────────────────────────────────────
    def _detect_approaching_deadlines(
        self, new_data: dict, reminder_minutes: Optional[int] = None
    ) -> list:
        """
        Checks ALL current assignments and fires reminders
        if deadline is within a reminder window.
        
        Smart logic: only fires ONCE per window per assignment.
        (Handled by the scheduler using a "sent_reminders" set)
        """
        alerts = []
        now    = datetime.now()

        reminder_windows = self.REMINDER_WINDOWS
        if reminder_minutes is not None:
            try:
                minutes = max(1, int(reminder_minutes))
                label = "1 day" if minutes == 1440 else ("1 hour" if minutes == 60 else f"{minutes} minutes")
                reminder_windows = [(minutes, label)]
            except (TypeError, ValueError):
                pass

        for key, assignment_list in new_data.get("assignments", {}).items():
            course_name = self._get_course_name(key, new_data)

            for assignment in assignment_list:
                # Skip already submitted
                if assignment.get("is_submitted"):
                    continue

                due = self._parse_date(assignment.get("due_date", ""))
                if not due:
                    continue

                # Skip if already past deadline
                if due < now:
                    continue

                minutes_left = (due - now).total_seconds() / 60

                for window_mins, window_label in reminder_windows:
                    # Fire if we're within 5 minutes of a reminder window
                    if abs(minutes_left - window_mins) <= 5:
                        urgency = "high" if window_mins <= 60 else "medium"

                        alerts.append({
                            "type":    "deadline_approaching",
                            "title":   f"⏰ Due in {window_label}!",
                            "body":    f"{assignment['assignment_name']} • {course_name}",
                            "course":  course_name,
                            "urgency": urgency,
                            "window":  window_label,
                            "data":    assignment,
                            # Unique key to prevent duplicate reminders
                            "reminder_key": f"{assignment.get('assignment_id')}_{window_mins}"
                        })

        return alerts


    # ── NEW MATERIALS ──────────────────────────────────────────────────────────
    def _detect_new_materials(self, old_data: dict, new_data: dict) -> list:
        alerts = []

        old_mats = old_data.get("materials", {})
        new_mats = new_data.get("materials", {})

        for key, new_list in new_mats.items():
            old_list = old_mats.get(key, [])
            old_ids  = {m["material_id"] for m in old_list if m.get("material_id")}

            for mat in new_list:
                if mat.get("material_id") not in old_ids:
                    course_name = self._get_course_name(key, new_data)

                    alerts.append({
                        "type":    "new_material",
                        "title":   f"📄 New Material: {mat['title']}",
                        "body":    f"{course_name} • {mat.get('chapter', 'General')}",
                        "course":  course_name,
                        "urgency": "low",
                        "data":    mat
                    })

        return alerts


    # ── HELPER FUNCTIONS ───────────────────────────────────────────────────────
    def _parse_date(self, date_str) -> Optional[datetime]:
        """Try multiple date formats VOLP might use."""
        if date_str is None or date_str == "":
            return None

        if isinstance(date_str, (int, float)):
            try:
                ts = float(date_str)
                if ts > 10_000_000_000:
                    ts = ts / 1000.0
                return datetime.fromtimestamp(ts)
            except (OSError, ValueError, OverflowError):
                return None

        if not isinstance(date_str, str) or not date_str.strip():
            return None

        raw = date_str.strip().replace("Z", "")
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M",
            "%d-%b-%Y %H:%M:%S",
            "%d-%b-%Y %H:%M",
            "%d-%b-%Y %I:%M %p",
            "%d-%b-%Y",
            "%d %b %Y %H:%M:%S",
            "%d %b %Y %H:%M",
            "%d %b %Y",
            "%d-%m-%Y %H:%M:%S",
            "%d-%m-%Y %H:%M",
            "%d-%m-%Y",
            "%Y-%m-%d",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%d/%m/%Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(raw[:26], fmt) if fmt.endswith("%f") else datetime.strptime(raw, fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(raw)
        except ValueError:
            return None


    def _format_due_date(self, due: datetime) -> str:
        """Human-friendly due date string."""
        now   = datetime.now()
        delta = due - now

        if delta.days == 0:
            hours = int(delta.seconds / 3600)
            if hours == 0:
                mins = int(delta.seconds / 60)
                return f"in {mins} minutes ({due.strftime('%I:%M %p')})"
            return f"today at {due.strftime('%I:%M %p')} ({hours}hrs left)"
        elif delta.days == 1:
            return f"tomorrow at {due.strftime('%I:%M %p')}"
        else:
            return f"{due.strftime('%d %b')} at {due.strftime('%I:%M %p')} ({delta.days} days)"


    def _get_urgency(self, due: Optional[datetime]) -> str:
        if not due:
            return "low"
        hours_left = (due - datetime.now()).total_seconds() / 3600
        if hours_left <= 2:   return "high"
        if hours_left <= 24:  return "medium"
        return "low"


    def _get_course_name(self, key: str, data: dict) -> str:
        """Find course name from a "crsid_colid" key.

        Matches on both ids — several courses can share a colid — and compares
        them as strings so a non-numeric id from VOLP never raises.
        """
        parts = str(key or "").split("_")
        if len(parts) < 2:
            return "Unknown Course"
        crsid, colid = parts[0], parts[1]
        courses = data.get("courses") or []
        if not isinstance(courses, list):
            return "Unknown Course"

        def title(course: dict) -> str:
            return course.get("display_name") or course.get("course_name") or "Unknown Course"

        for course in courses:
            if not isinstance(course, dict):
                continue
            if str(course.get("crsid")) == crsid and str(course.get("colid")) == colid:
                return title(course)
        # Fall back to crsid alone: content-derived keys sometimes carry a
        # different colid than the course list does.
        for course in courses:
            if isinstance(course, dict) and str(course.get("crsid")) == crsid:
                return title(course)
        return "Unknown Course"
