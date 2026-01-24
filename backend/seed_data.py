import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def seed_machines():
    """Seed initial machine data"""
    machines = [
        {
            'id': str(uuid.uuid4()),
            'machine_code': 'SLIT-001',
            'machine_name': 'Slitting Machine 1',
            'machine_type': 'slitting',
            'capacity': 120,
            'location': 'SGM',
            'status': 'active'
        },
        {
            'id': str(uuid.uuid4()),
            'machine_code': 'SLIT-002',
            'machine_name': 'Slitting Machine 2',
            'machine_type': 'slitting',
            'capacity': 120,
            'location': 'SGM',
            'status': 'active'
        },
        {
            'id': str(uuid.uuid4()),
            'machine_code': 'CL1',
            'machine_name': 'BOPP Coating Line 1',
            'machine_type': 'coating',
            'capacity': 500,
            'location': 'SGM',
            'status': 'active'
        },
        {
            'id': str(uuid.uuid4()),
            'machine_code': 'CL2',
            'machine_name': 'Hotmelt Coating Line 2',
            'machine_type': 'coating',
            'capacity': 400,
            'location': 'SGM',
            'status': 'active'
        },
        {
            'id': str(uuid.uuid4()),
            'machine_code': 'RW-001',
            'machine_name': 'Rewinding Machine 1',
            'machine_type': 'rewinding',
            'capacity': 200,
            'location': 'SGM',
            'status': 'active'
        }
    ]
    
    existing = await db.machines.count_documents({})
    if existing == 0:
        await db.machines.insert_many(machines)
        print(f"✓ Seeded {len(machines)} machines")
    else:
        print(f"✓ Machines already exist ({existing} records)")


async def main():
    print("Starting data seeding...\n")
    
    try:
        await seed_machines()
        print("\n✓ Data seeding completed successfully!")
    except Exception as e:
        print(f"\n✗ Error during seeding: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())