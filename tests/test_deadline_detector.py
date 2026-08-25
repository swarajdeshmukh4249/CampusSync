"""
Unit tests for DeadlineDetector — pure logic, no external services needed.
Run with: python -m pytest test_deadline_detector.py -v
"""

from datetime import datetime, timedelta
from deadline_detector import DeadlineDetector


def make_assignment(assignment_id="a1", name="Lab Report 3", due_in_minutes=None, is_submitted=False):
    due_date = ""
    if due_in_minutes is not None:
        due_dt = datetime.now() + timedelta(minutes=due_in_minutes)
        due_date = due_dt.strftime("%Y-%m-%d %H:%M:%S")
    return {
        "assignment_id": assignment_id,
        "assignment_name": name,
        "due_date": due_date,
        "is_submitted": is_submitted,
    }


def make_data(assignments=None, courses=None):
    return {
        "courses": courses or [{"crsid": 1, "colid": 100, "display_name": "Data Analysis", "course_name": "DA101"}],
        "assignments": {"1_100": assignments or []},
        "announcements": {},
        "materials": {},
    }


def test_parse_date_multiple_formats():
    d = DeadlineDetector()
    assert d._parse_date("2026-08-24 10:00:00") is not None
    assert d._parse_date("2026-08-24T10:00:00") is not None
    assert d._parse_date("24-08-2026") is not None
    assert d._parse_date("") is None
    assert d._parse_date("garbage") is None


def test_new_assignment_detected():
    d = DeadlineDetector()
    old = make_data(assignments=[])
    new = make_data(assignments=[make_assignment(due_in_minutes=500)])
    alerts = d.detect_changes(old, new)
    new_assignment_alerts = [a for a in alerts if a["type"] == "new_assignment"]
    assert len(new_assignment_alerts) == 1
    assert new_assignment_alerts[0]["course"] == "Data Analysis"


def test_no_duplicate_alert_for_existing_assignment():
    d = DeadlineDetector()
    existing = make_assignment(due_in_minutes=500)
    old = make_data(assignments=[existing])
    new = make_data(assignments=[existing])
    alerts = d.detect_changes(old, new)
    new_assignment_alerts = [a for a in alerts if a["type"] == "new_assignment"]
    assert len(new_assignment_alerts) == 0


def test_deadline_approaching_fires_within_window():
    d = DeadlineDetector()
    # 20 minutes left — should fire the "20 minutes" window
    new = make_data(assignments=[make_assignment(due_in_minutes=20)])
    alerts = d.detect_changes(new, new)  # old==new so no "new_assignment" noise
    deadline_alerts = [a for a in alerts if a["type"] == "deadline_approaching"]
    assert len(deadline_alerts) == 1
    assert deadline_alerts[0]["window"] == "20 minutes"
    assert deadline_alerts[0]["urgency"] == "high"


def test_deadline_approaching_skips_submitted():
    d = DeadlineDetector()
    new = make_data(assignments=[make_assignment(due_in_minutes=20, is_submitted=True)])
    alerts = d.detect_changes(new, new)
    deadline_alerts = [a for a in alerts if a["type"] == "deadline_approaching"]
    assert len(deadline_alerts) == 0


def test_deadline_approaching_skips_past_due():
    d = DeadlineDetector()
    new = make_data(assignments=[make_assignment(due_in_minutes=-30)])
    alerts = d.detect_changes(new, new)
    deadline_alerts = [a for a in alerts if a["type"] == "deadline_approaching"]
    assert len(deadline_alerts) == 0


def test_deadline_approaching_no_alert_outside_window():
    d = DeadlineDetector()
    # 45 minutes left doesn't match any window (24h, 6h, 1h, 20min) within +-5min tolerance
    new = make_data(assignments=[make_assignment(due_in_minutes=45)])
    alerts = d.detect_changes(new, new)
    deadline_alerts = [a for a in alerts if a["type"] == "deadline_approaching"]
    assert len(deadline_alerts) == 0


def test_reminder_key_is_unique_per_assignment_and_window():
    d = DeadlineDetector()
    a1 = make_assignment(assignment_id="a1", due_in_minutes=60)
    a2 = make_assignment(assignment_id="a2", due_in_minutes=60)
    new = make_data(assignments=[a1, a2])
    alerts = d.detect_changes(new, new)
    keys = {a["reminder_key"] for a in alerts if a["type"] == "deadline_approaching"}
    assert keys == {"a1_60", "a2_60"}


def test_get_course_name_unknown_when_no_match():
    d = DeadlineDetector()
    data = make_data()
    assert d._get_course_name("999_999", data) == "Unknown Course"


def test_get_urgency_thresholds():
    d = DeadlineDetector()
    now = datetime.now()
    assert d._get_urgency(now + timedelta(hours=1)) == "high"
    assert d._get_urgency(now + timedelta(hours=10)) == "medium"
    assert d._get_urgency(now + timedelta(hours=48)) == "low"
    assert d._get_urgency(None) == "low"