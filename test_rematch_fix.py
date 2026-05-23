#!/usr/bin/env python3
"""
Test script to verify that profile updates trigger automatic rematching.

This script:
1. Creates a test buyer with a requirement
2. Creates a test supplier with limited profile
3. Checks initial match score (should be low)
4. Updates supplier profile with better matching info
5. Waits for background rematching
6. Verifies match score improved

Usage:
    python test_rematch_fix.py
"""
import asyncio
import sys
import os
from datetime import datetime

# Add api directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.user import User
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.models.lead import Lead
from app.models.user_config import UserConfig
from app.services.matching_service import match_requirement_to_suppliers
from app.services.rematch_service import rematch_all_requirements_for_supplier
from app.agents.profile_converter import json_to_markdown


async def cleanup_test_data(db):
    """Remove test data from previous runs."""
    print("🧹 Cleaning up old test data...")

    # Find test users
    result = await db.execute(
        select(User).where(User.phone.in_(['9999000001', '9999000002']))
    )
    test_users = result.scalars().all()

    for user in test_users:
        # Delete related data
        await db.execute(select(Lead).where(
            (Lead.buyer_id == user.id) | (Lead.supplier_id == user.id)
        ))
        await db.execute(select(Requirement).where(Requirement.buyer_id == user.id))
        await db.execute(select(UserConfig).where(UserConfig.user_id == user.id))
        await db.execute(select(AgenticProfile).where(AgenticProfile.user_id == user.id))
        await db.delete(user)

    await db.commit()
    print("✅ Cleanup complete")


async def create_test_buyer(db):
    """Create a test buyer with a requirement."""
    print("\n👤 Creating test buyer...")

    # Create user
    buyer = User(
        phone="9999000001",
        is_verified=True,
        is_onboarded=True
    )
    db.add(buyer)
    await db.flush()

    # Create profile
    buyer_profile = AgenticProfile(
        user_id=buyer.id,
        gstin="TEST01BUYER001",
        trade_name="Test Buyer Company",
        is_buyer=True,
        is_supplier=False,
        state="Maharashtra",
        city="Mumbai"
    )
    db.add(buyer_profile)

    # Create config
    buyer_config = UserConfig(
        user_id=buyer.id,
        profile_md="Test buyer looking for cotton shirts"
    )
    db.add(buyer_config)

    # Create requirement
    requirement = Requirement(
        buyer_id=buyer.id,
        product="Cotton Shirts",
        quantity=500,
        quantity_unit="pieces",
        budget_max=5000,
        budget_unit="INR",
        delivery_location="Mumbai, Maharashtra",
        delivery_days=15,
        specifications={"color": "blue", "size": "M"},
        enrichment_status="enriched"
    )
    db.add(requirement)
    await db.flush()

    print(f"✅ Created buyer #{buyer.id} with requirement #{requirement.id}")
    return buyer, requirement


async def create_test_supplier_v1(db):
    """Create a test supplier with limited profile (poor match)."""
    print("\n🏭 Creating test supplier (limited profile)...")

    # Create user
    supplier = User(
        phone="9999000002",
        is_verified=True,
        is_onboarded=True
    )
    db.add(supplier)
    await db.flush()

    # Create basic profile (won't match well with cotton shirts)
    supplier_profile = AgenticProfile(
        user_id=supplier.id,
        gstin="TEST01SUPPLIER001",
        trade_name="Test Supplier Ltd",
        is_buyer=False,
        is_supplier=True,
        state="Gujarat",  # Different state
        city="Ahmedabad",
        product_categories=["Textiles"],  # Generic category
        pricing_bands=None  # No pricing info
    )
    db.add(supplier_profile)

    # Create minimal config
    profile_json_v1 = {
        "company_name": "Test Supplier Ltd",
        "product_categories": ["Textiles"],
        "infrastructure": {
            "production_capacity": "1000 units per week"
        },
        "products": []  # No specific products
    }

    supplier_config = UserConfig(
        user_id=supplier.id,
        profile_json=profile_json_v1,
        profile_md=json_to_markdown(profile_json_v1)
    )
    db.add(supplier_config)
    await db.flush()

    print(f"✅ Created supplier #{supplier.id} with limited profile")
    return supplier, supplier_profile, supplier_config


async def update_supplier_profile_v2(db, supplier, supplier_profile, supplier_config):
    """Update supplier profile with better matching information."""
    print("\n🔄 Updating supplier profile (adding cotton shirts)...")

    # Update profile with matching products
    profile_json_v2 = {
        "company_name": "Test Supplier Ltd",
        "product_categories": ["Textiles", "Cotton Garments", "Shirts"],
        "infrastructure": {
            "production_capacity": "5000 units per week"
        },
        "products": [
            {
                "name": "Cotton Shirts",
                "description": "High quality cotton shirts for corporate wear",
                "price_range": "₹80 - ₹150 per piece",
                "moq": "100 pieces"
            },
            {
                "name": "Polo Shirts",
                "description": "Cotton polo shirts",
                "price_range": "₹100 - ₹200 per piece",
                "moq": "50 pieces"
            }
        ]
    }

    # Update database
    supplier_profile.product_categories = profile_json_v2["product_categories"]
    supplier_profile.pricing_bands = {"basic": "80-150", "premium": "150-200"}
    supplier_profile.state = "Maharashtra"  # Same state now!
    supplier_profile.city = "Pune"

    supplier_config.profile_json = profile_json_v2
    supplier_config.profile_md = json_to_markdown(profile_json_v2)

    await db.flush()
    await db.commit()

    print("✅ Supplier profile updated with matching products")


async def run_test():
    """Main test function."""
    print("=" * 60)
    print("🧪 TESTING AUTOMATIC REMATCHING ON PROFILE UPDATE")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        try:
            # Step 1: Cleanup
            await cleanup_test_data(db)

            # Step 2: Create test data
            buyer, requirement = await create_test_buyer(db)
            supplier, supplier_profile, supplier_config = await create_test_supplier_v1(db)
            await db.commit()

            # Step 3: Initial matching
            print("\n📊 Running initial match...")
            leads = await match_requirement_to_suppliers(requirement, db)
            await db.commit()

            # Check initial lead
            initial_lead = None
            for lead in leads:
                if lead.supplier_id == supplier.id:
                    initial_lead = lead
                    break

            if initial_lead:
                initial_score = initial_lead.fit_score
                print(f"✅ Initial lead created: ID={initial_lead.id}, Score={initial_score:.1f}%")
                print(f"   Match reasons: {initial_lead.match_reasons}")
            else:
                initial_score = 0
                print(f"⚠️  No initial lead created (score below threshold)")

            # Step 4: Update supplier profile
            await update_supplier_profile_v2(db, supplier, supplier_profile, supplier_config)

            # Step 5: Trigger rematching
            print("\n🔄 Triggering rematch...")
            result = await rematch_all_requirements_for_supplier(supplier.id, db)
            await db.commit()

            print(f"\n📈 Rematch results:")
            print(f"   Requirements checked: {result.get('requirements_checked', 0)}")
            print(f"   Leads updated: {result.get('leads_updated', 0)}")
            print(f"   Leads created: {result.get('leads_created', 0)}")
            print(f"   Leads deleted: {result.get('leads_deleted', 0)}")
            print(f"   Scores improved: {result.get('scores_improved', 0)}")

            # Step 6: Verify updated score
            print("\n🔍 Verifying updated lead...")
            lead_result = await db.execute(
                select(Lead).where(
                    Lead.requirement_id == requirement.id,
                    Lead.supplier_id == supplier.id
                )
            )
            updated_lead = lead_result.scalar_one_or_none()

            if updated_lead:
                updated_score = updated_lead.fit_score
                improvement = updated_score - initial_score
                print(f"✅ Lead updated: ID={updated_lead.id}")
                print(f"   Initial score: {initial_score:.1f}%")
                print(f"   Updated score: {updated_score:.1f}%")
                print(f"   Improvement: +{improvement:.1f}%")
                print(f"   New match reasons: {updated_lead.match_reasons}")

                # Verify improvement
                if improvement > 10:
                    print("\n" + "=" * 60)
                    print("✅ TEST PASSED: Score improved significantly!")
                    print("   The automatic rematching is working correctly.")
                    print("=" * 60)
                    return True
                else:
                    print("\n" + "=" * 60)
                    print("⚠️  TEST WARNING: Score improved but not significantly")
                    print(f"   Expected >10% improvement, got {improvement:.1f}%")
                    print("=" * 60)
                    return False
            else:
                print("\n" + "=" * 60)
                print("❌ TEST FAILED: No lead found after rematch")
                print("=" * 60)
                return False

        except Exception as e:
            print("\n" + "=" * 60)
            print(f"❌ TEST FAILED WITH ERROR: {e}")
            print("=" * 60)
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    print(f"\n🕒 Test started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    success = asyncio.run(run_test())

    print(f"\n🕒 Test completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    sys.exit(0 if success else 1)
