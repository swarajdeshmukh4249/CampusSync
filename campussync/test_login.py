# test_login.py
import asyncio
from volp_client import VOLPClient

async def test():
    client = VOLPClient()
    result = await client.login(
        "your_vit_email@vit.edu",
        "your_password"
    )
    print("Login result:", result)

    if result["success"]:
        courses = await client.get_courses()
        print(f"Found {len(courses)} courses:")
        for c in courses:
            print(f"  → {c['display_name']} (crsid: {c['crsid']})")

    await client.close()

asyncio.run(test())