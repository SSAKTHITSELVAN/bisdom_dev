"""
Run database migration to add profile_json column.
"""
import asyncio
from sqlalchemy import text
from app.db.base import engine


async def run_migration():
    """Add profile_json column to user_configs table."""
    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='user_configs' AND column_name='profile_json'
        """))
        exists = result.fetchone() is not None

        if exists:
            print("✓ profile_json column already exists")
            return

        # Add the column
        await conn.execute(text("""
            ALTER TABLE user_configs
            ADD COLUMN profile_json JSONB DEFAULT '{}'
        """))
        print("✓ Added profile_json column to user_configs")

        # Add comments
        await conn.execute(text("""
            COMMENT ON COLUMN user_configs.profile_json IS 'Source of truth - structured JSON for UI editing'
        """))
        await conn.execute(text("""
            COMMENT ON COLUMN user_configs.profile_md IS 'Auto-generated cache - markdown for AI agents'
        """))
        print("✓ Added column comments")

    print("\n✅ Migration completed successfully")


if __name__ == "__main__":
    asyncio.run(run_migration())
