"""
Script to preprocess all supplier products.
Run this after deploying the new matching algorithm.
"""
import asyncio
import logging
import sys

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import all models to avoid circular dependency issues
from app.db.base import AsyncSessionLocal, Base
from app.models.user import User
from app.models.profile import AgenticProfile
from app.models.user_config import UserConfig
from app.models.supplier_product import SupplierProduct
from app.services.product_preprocessing import preprocess_supplier_products
from sqlalchemy import select


async def main():
    """Preprocess all supplier products."""
    print("\n" + "="*60)
    print("  PREPROCESSING ALL SUPPLIERS")
    print("="*60 + "\n")

    async with AsyncSessionLocal() as db:
        try:
            # Get all user configs with profile_json
            result = await db.execute(
                select(UserConfig).where(UserConfig.profile_json.isnot(None))
            )
            configs = result.scalars().all()

            logger.info(f"Found {len(configs)} suppliers with profile data")

            if len(configs) == 0:
                print("\n⚠️  No suppliers found with profile_json")
                print("Make sure suppliers have completed onboarding.\n")
                return

            total_products = 0
            successful = 0
            failed = 0

            for config in configs:
                # Get supplier profile for display name
                profile_result = await db.execute(
                    select(AgenticProfile).where(AgenticProfile.user_id == config.user_id)
                )
                profile = profile_result.scalar_one_or_none()

                supplier_name = profile.trade_name if profile else f"User #{config.user_id}"

                print(f"\nProcessing: {supplier_name}")
                print(f"  User ID: {config.user_id}")

                try:
                    count = await preprocess_supplier_products(
                        user_id=config.user_id,
                        db=db,
                        force_refresh=True
                    )

                    total_products += count
                    successful += 1
                    print(f"  ✓ Processed {count} products")

                except Exception as e:
                    failed += 1
                    print(f"  ✗ Error: {e}")
                    logger.error(f"Failed to preprocess user #{config.user_id}: {e}")
                    continue

            # Commit all changes
            await db.commit()

            # Print summary
            print("\n" + "="*60)
            print("  PREPROCESSING COMPLETE")
            print("="*60)
            print(f"\nTotal suppliers: {len(configs)}")
            print(f"Successful: {successful}")
            print(f"Failed: {failed}")
            print(f"Total products: {total_products}")
            print("\n" + "="*60 + "\n")

            # Verify
            verify_result = await db.execute(select(SupplierProduct))
            all_products = verify_result.scalars().all()

            with_embeddings = len([p for p in all_products if p.embedding is not None])

            print(f"✓ Verification: {len(all_products)} products in database")
            print(f"✓ {with_embeddings} products have embeddings")
            print()

        except Exception as e:
            logger.error(f"Fatal error: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
