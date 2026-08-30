from campussync.volp_client import (
    _course_flags,
    _extract_due_date,
    _extract_submitted,
    _is_submitted,
    _merge_assignments,
    is_active_course,
)


def test_merge_assignments_prefers_due_date_and_submission_from_any_source():
    dashboard = [{
        "assignment_id": "42",
        "assignment_name": "Assignment",
        "due_date": "",
        "is_submitted": False,
    }]
    typed = [{
        "assignment_id": "42",
        "assignment_name": "Assignment",
        "due_date": "2026-09-01 23:59:00",
        "is_submitted": True,
        "submission_date": "2026-08-30 10:00:00",
    }]

    merged = _merge_assignments(dashboard, typed)

    assert len(merged) == 1
    assert merged[0]["due_date"] == "2026-09-01 23:59:00"
    assert merged[0]["is_submitted"] is True
    assert merged[0]["submission_date"] == "2026-08-30 10:00:00"


def test_extract_due_date_checks_camel_case_fields():
    item = {"dueDate": "2026-10-15 18:00:00", "end_date": "ignored"}
    assert _extract_due_date(item) == "2026-10-15 18:00:00"


def test_extract_submitted_recognizes_status_strings():
    assert _is_submitted("Submitted") is True
    assert _is_submitted("pending") is False
    assert _extract_submitted({"submissionStatus": "completed"}) is True
    assert _extract_submitted({"status": "Submitted"}) is True


def test_course_flags_detect_archived_and_inactive():
    assert _course_flags({"status": "archived"}) == (False, True)
    assert _course_flags({"status": "inactive"}) == (False, False)
    assert _course_flags({"course_status": "0"}) == (False, False)
    assert _course_flags({"status": "active"}) == (True, False)


def test_is_active_course():
    assert is_active_course({"is_active": True, "is_archived": False}) is True
    assert is_active_course({"is_active": True, "is_archived": True}) is False
    assert is_active_course({"is_active": False, "is_archived": False}) is False
