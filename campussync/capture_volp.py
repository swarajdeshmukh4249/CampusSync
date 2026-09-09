"""
CampusSync — VOLP response capture
-----------------------------------
Dumps the RAW JSON that VOLP returns for your courses and assignments, so the
question text, attached question file, marks and due date can be parsed against
what VOLP actually sends instead of guessed field names.

Run from the campussync/ directory with the venv active:

    source venv311/bin/activate
    python capture_volp.py

It asks for your VOLP login, writes one .json file per endpoint into
volp_dump/, and prints a summary. Nothing is uploaded anywhere.

NOTE: VOLP allows one active session per account. Running this signs you in and
will log you out of VOLP in your browser. Close the VOLP tab first, and expect
to sign in again there afterwards.
"""

import asyncio
import getpass
import json
import os
import sys

from volp_client import (
    VOLPClient, is_active_course, _extract_assignment_ids,
    COURSES_URL, ASSIGNMENTS_URL, OBJECTIVE_ASSIGNMENTS_URL,
    SUBJECTIVE_ASSIGNMENTS_URL, HANDSON_ASSIGNMENTS_URL,
    TESTS_URL, COURSE_CONTENT_URL,
)

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "volp_dump")


def save(name: str, payload) -> str:
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return path


async def post(client: VOLPClient, label: str, url: str, payload: dict, bearer: bool = True):
    """POST one endpoint and dump whatever comes back."""
    headers = client._bearer_auth_headers() if bearer else client._auth_headers()
    try:
        response = await client.http.post(url, json=payload, headers=headers)
    except Exception as e:
        print(f"  {label:34} request failed: {e}")
        return
    try:
        body = response.json()
    except Exception:
        body = {"_non_json_body": response.text[:4000]}
    path = save(label, {"_request": payload, "_status": response.status_code, "body": body})
    size = len(json.dumps(body))
    print(f"  {label:34} HTTP {response.status_code}  {size:>7} bytes  -> {os.path.basename(path)}")


async def main():
    username = input("VOLP username/email: ").strip()
    password = getpass.getpass("VOLP password (not echoed, not saved): ")

    client = VOLPClient()
    result = await client.login(username, password)
    if not result.get("success"):
        print(f"\nLogin failed: {result.get('message')}")
        await client.close()
        sys.exit(1)
    print("\nLogged in. Capturing…\n")

    courses = await client.get_courses()
    save("00_courses", courses)
    active = [c for c in courses if is_active_course(c)]
    print(f"  {'courses':34} {len(active)} active of {len(courses)}  -> 00_courses.json")

    # Capture the first two active courses; enough to see every payload shape
    # without dumping an entire degree.
    for index, course in enumerate(active[:2], start=1):
        crsid, colid = course.get("crsid"), course.get("colid")
        name = course.get("display_name") or course.get("course_name") or f"{crsid}_{colid}"
        print(f"\n[{index}] {name}  (crsid={crsid}, colid={colid})")

        content = await client.get_course_content_data(crsid, colid)
        save(f"{index}_content_data", content)
        ids = _extract_assignment_ids(content)
        print(f"  {'courseContentData':34} ids: " + ", ".join(
            f"{k}={len(v)}" for k, v in ids.items() if v) or "  (no assignment ids found)")

        await post(client, f"{index}_dashboard_assignments", ASSIGNMENTS_URL,
                   {"crsid": crsid, "colid": colid, "uid": client.uid}, bearer=False)
        await post(client, f"{index}_handson_all", HANDSON_ASSIGNMENTS_URL,
                   {"courseId": colid, "studentId": client.uid})
        await post(client, f"{index}_subjective_all", SUBJECTIVE_ASSIGNMENTS_URL,
                   {"courseId": colid, "studentId": client.uid})
        await post(client, f"{index}_objective_all", OBJECTIVE_ASSIGNMENTS_URL,
                   {"courseId": colid, "studentId": client.uid})
        await post(client, f"{index}_tests", TESTS_URL,
                   {"crsid": crsid, "colid": colid, "uid": client.uid}, bearer=False)

        # The per-assignment calls are the ones that carry the question text
        # and the attached question file, so capture one of each kind by id.
        for kind, key in (("handson", "hands"), ("subjective", "swa"), ("objective", "mcq")):
            for assignment_id in (ids.get(key) or [])[:2]:
                url = {"handson": HANDSON_ASSIGNMENTS_URL,
                       "subjective": SUBJECTIVE_ASSIGNMENTS_URL,
                       "objective": OBJECTIVE_ASSIGNMENTS_URL}[kind]
                await post(client, f"{index}_{kind}_id_{assignment_id}", url,
                           {"courseId": colid, "studentId": client.uid,
                            "assignmentId": assignment_id, "assid": assignment_id})

    await client.close()
    print(f"\nDone. Files are in:\n  {OUT_DIR}\n")
    print("Zip that folder and share it, or paste one subjective and one handson file.")
    print("It contains your coursework — no password is stored in it.")


if __name__ == "__main__":
    asyncio.run(main())
