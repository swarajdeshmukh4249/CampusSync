"""
Test script for new VOLP assignment endpoints.
This will help us understand the actual data structures returned by VOLP.
"""

import asyncio
import sys
import os

# Add the campussync directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'campussync'))

try:
    from volp_client import VOLPClient
except ImportError:
    # Fallback: try adding parent directory
    sys.path.insert(0, os.path.dirname(__file__))
    from campussync.volp_client import VOLPClient


async def test_new_endpoints():
    """Test the new assignment endpoints with real VOLP credentials."""

    print("=== VOLP New Endpoints Test ===\n")

    # Get credentials from command line arguments or environment variables
    import os
    username = os.getenv("VOLP_USERNAME") or os.getenv("VOLP_USER")
    password = os.getenv("VOLP_PASSWORD") or os.getenv("VOLP_PASS")

    # If not in environment, try command line args
    if len(sys.argv) > 2:
        username = sys.argv[1]
        password = sys.argv[2]
    elif not username or not password:
        print("❌ Please provide VOLP credentials either:")
        print("   - As environment variables: VOLP_USERNAME and VOLP_PASSWORD")
        print("   - As command line arguments: python test_new_endpoints.py <username> <password>")
        return

    if not username or not password:
        print("❌ Username and password are required")
        return
    
    client = VOLPClient()
    
    # Test login
    print("\n🔐 Testing login...")
    login_result = await client.login(username, password)
    
    if not login_result["success"]:
        print(f"❌ Login failed: {login_result['message']}")
        await client.close()
        return
    
    print(f"✅ Login successful: {login_result['message']}")
    print(f"   User type: {login_result.get('user_type', 'Unknown')}")
    print(f"   JWT token: {'Present' if client.jwt_token else 'Missing'}")
    print(f"   Vue session key: {'Present' if client.vue_session_key else 'Missing'}")
    
    # Get courses
    print("\n📚 Fetching courses...")
    courses = await client.get_courses()
    print(f"✅ Found {len(courses)} courses")
    print("\n📚 Course details:")
    for course in courses:
        print(f"   - {course.get('display_name') or course.get('course_name')}")
        print(f"     is_archived: {course.get('is_archived')}")
        print(f"     status: {course.get('status')}")
        print(f"     crsid: {course.get('crsid')}, colid: {course.get('colid')}")
    
    if not courses:
        print("❌ No courses found. Cannot test assignment endpoints.")
        await client.close()
        return
    
    # Use the first active course for testing
    test_course = None
    for course in courses:
        if not course.get("is_archived"):
            test_course = course
            break
    
    if not test_course:
        test_course = courses[0]
    
    crsid = test_course.get("crsid")
    colid = test_course.get("colid")
    course_name = test_course.get("display_name") or test_course.get("course_name")
    
    print(f"\n🎯 Testing with course: {course_name}")
    print(f"   crsid: {crsid}, colid: {colid}")
    
    # Test each new endpoint
    print("\n" + "="*50)
    print("Testing new assignment endpoints:")
    print("="*50)
    
    # Test Objective Assignments
    print("\n📝 Testing Objective Assignments endpoint...")
    try:
        objective = await client.get_objective_assignments(crsid, colid)
        print(f"✅ Objective assignments: {len(objective)} found")
        if objective:
            print(f"   Sample: {objective[0].get('assignment_name', 'N/A')}")
            print(f"   Fields: {list(objective[0].keys())}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test Subjective Assignments
    print("\n📝 Testing Subjective Assignments endpoint...")
    try:
        subjective = await client.get_subjective_assignments(crsid, colid)
        print(f"✅ Subjective assignments: {len(subjective)} found")
        if subjective:
            print(f"   Sample: {subjective[0].get('assignment_name', 'N/A')}")
            print(f"   Fields: {list(subjective[0].keys())}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test Hands-On Assignments
    print("\n📝 Testing Hands-On Assignments endpoint...")
    try:
        hands_on = await client.get_hands_on_assignments(crsid, colid)
        print(f"✅ Hands-on assignments (no IDs): {len(hands_on)} found")
        if hands_on:
            print(f"   Sample: {hands_on[0].get('assignment_name', 'N/A')}")
            print(f"   Fields: {list(hands_on[0].keys())}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test with specific assignment IDs
    print("\n📝 Testing Hands-On Assignments with specific IDs [72351]...")
    try:
        hands_on_specific = await client.get_hands_on_assignments(crsid, colid, [72351])
        print(f"✅ Hands-on assignments (with ID 72351): {len(hands_on_specific)} found")
        if hands_on_specific:
            print(f"   Sample: {hands_on_specific[0].get('assignment_name', 'N/A')}")
            print(f"   Full assignment: {hands_on_specific[0]}")
        else:
            print("   No assignments found with specific ID")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test with project IDs from datastructure1 course
    print("\n📝 Testing with project IDs from datastructure1 [71537, 71886]...")
    try:
        project_specific = await client.get_hands_on_assignments(15839, 711460, [71537, 71886])
        print(f"✅ Project assignments: {len(project_specific)} found")
        if project_specific:
            print(f"   Sample: {project_specific[0].get('assignment_name', 'N/A')}")
            print(f"   Full assignment: {project_specific[0]}")
        else:
            print("   No assignments found with project IDs")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test old assignment endpoint
    print("\n📝 Testing old assignment endpoint (learnerAssignmentList)...")
    try:
        old_assignments = await client.get_assignments(crsid, colid, include_content=False)
        print(f"✅ Old endpoint assignments (no content): {len(old_assignments)} found")
        if old_assignments:
            print(f"   Sample: {old_assignments[0].get('assignment_name', 'N/A')}")
            print(f"   Sample fields: {list(old_assignments[0].keys())}")
            print(f"   Sample due_date: {old_assignments[0].get('due_date')}")
            print(f"   Sample is_submitted: {old_assignments[0].get('is_submitted')}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test old assignment endpoint with content
    print("\n📝 Testing old assignment endpoint with course content...")
    try:
        old_assignments_with_content = await client.get_assignments(crsid, colid, include_content=True)
        print(f"✅ Old endpoint assignments (with content): {len(old_assignments_with_content)} found")
        if old_assignments_with_content:
            print(f"   Sample: {old_assignments_with_content[0].get('assignment_name', 'N/A')}")
            print(f"   Sample fields: {list(old_assignments_with_content[0].keys())}")
            print(f"   Sample due_date: {old_assignments_with_content[0].get('due_date')}")
            print(f"   Sample is_submitted: {old_assignments_with_content[0].get('is_submitted')}")
            print(f"   All assignments: {old_assignments_with_content}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test Tests
    print("\n📝 Testing Tests endpoint...")
    try:
        tests = await client.get_tests(crsid, colid)
        print(f"✅ Tests: {len(tests)} found")
        if tests:
            print(f"   Sample: {tests[0].get('assignment_name', 'N/A')}")
            print(f"   Fields: {list(tests[0].keys())}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test Course Content Data
    print("\n📝 Testing Course Content Data endpoint...")
    try:
        content_data = await client.get_course_content_data(crsid, colid)
        print(f"✅ Course content data: {type(content_data)}")
        if isinstance(content_data, dict):
            print(f"   Keys: {list(content_data.keys())}")
            print(f"   Full data: {content_data}")
            # Deep dive into the structure to find assignments
            import json
            print(f"   JSON structure: {json.dumps(content_data, indent=2, default=str)[:1000]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test full sync
    print("\n" + "="*50)
    print("Testing full sync with all endpoints:")
    print("="*50)
    try:
        sync_result = await client.full_sync()
        print(f"✅ Full sync completed")
        print(f"   Courses: {len(sync_result.get('courses', []))}")
        total_assignments = sum(len(assignments) for assignments in sync_result.get('assignments', {}).values())
        print(f"   Total assignments: {total_assignments}")
        print(f"   Total announcements: {sum(len(ann) for ann in sync_result.get('announcements', {}).values())}")
        print(f"   Total materials: {sum(len(mat) for mat in sync_result.get('materials', {}).values())}")
    except Exception as e:
        print(f"❌ Full sync error: {e}")
    
    await client.close()
    print("\n✅ Test completed")


if __name__ == "__main__":
    asyncio.run(test_new_endpoints())
