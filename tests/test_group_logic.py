"""
Tests for group/invite-code logic WITHOUT a real Supabase connection.
- _generate_invite_code() is pure logic, tested directly.
- The submission-status aggregation logic (same shape as the
  /groups/{id}/status/{assignment_id} route in main_changes.md) is
  tested here against fake in-memory user data, since that route's
  logic isn't itself inside a class/function we can import yet —
  this test doubles as a spec for how it should behave once wired in.
"""

import re
from database import _generate_invite_code


def test_invite_code_format():
    code = _generate_invite_code()
    assert len(code) == 6
    assert re.fullmatch(r"[A-Z2-9]+", code), f"unexpected chars in {code}"


def test_invite_code_excludes_ambiguous_chars():
    # Generate many codes and make sure 0, O, 1, I never appear
    codes = "".join(_generate_invite_code() for _ in range(500))
    for banned in "01OI":
        assert banned not in codes


def test_invite_codes_are_reasonably_unique():
    codes = {_generate_invite_code() for _ in range(200)}
    # With a 33-char alphabet and length 6, collisions in 200 draws should be rare
    assert len(codes) > 190


# ── Submission-status aggregation logic (mirrors the /groups/.../status route) ──

def compute_group_status(members: list, assignment_id: str) -> list:
    """Same logic as the group_submission_status route in main_changes.md."""
    statuses = []
    for member in members:
        submitted = False
        for assignment_list in member["sync_data"].get("assignments", {}).values():
            for a in assignment_list:
                if str(a.get("assignment_id")) == str(assignment_id):
                    submitted = a.get("is_submitted", False)
        statuses.append({"username": member["username"], "submitted": submitted})
    return statuses


def test_group_status_mixed_submissions():
    members = [
        {"username": "alice", "sync_data": {"assignments": {"1_100": [
            {"assignment_id": "a1", "is_submitted": True}
        ]}}},
        {"username": "bob", "sync_data": {"assignments": {"1_100": [
            {"assignment_id": "a1", "is_submitted": False}
        ]}}},
    ]
    result = compute_group_status(members, "a1")
    assert result == [
        {"username": "alice", "submitted": True},
        {"username": "bob", "submitted": False},
    ]


def test_group_status_member_missing_assignment_defaults_false():
    # bob doesn't have this assignment in his sync_data at all (e.g. stale sync)
    members = [
        {"username": "bob", "sync_data": {"assignments": {}}},
    ]
    result = compute_group_status(members, "a1")
    assert result == [{"username": "bob", "submitted": False}]


def test_group_status_assignment_id_type_mismatch_handled():
    # assignment_id passed as int-like string vs stored as int — should still match
    members = [
        {"username": "alice", "sync_data": {"assignments": {"1_100": [
            {"assignment_id": 42, "is_submitted": True}
        ]}}},
    ]
    result = compute_group_status(members, "42")
    assert result == [{"username": "alice", "submitted": True}]