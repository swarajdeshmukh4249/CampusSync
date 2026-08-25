import asyncio
from campussync.database import Database

async def main():
    db = Database()
    res = await asyncio.to_thread(db.client.table('users').select('*').execute)
    print(res)

asyncio.run(main())
