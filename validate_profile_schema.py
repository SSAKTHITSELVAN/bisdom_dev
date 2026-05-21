#!/usr/bin/env python3
"""
Profile Schema Validator
Validates that a profile JSON matches the expected V4 schema structure
"""

import json
import sys
from typing import Dict, List, Any

def validate_basic_details(data: Dict[str, Any]) -> List[str]:
    """Validate basic_details section"""
    errors = []
    required_fields = ['company_name', 'gst_number', 'city', 'state']
    optional_fields = ['address', 'pincode', 'phone', 'email', 'website', 'other']

    if 'basic_details' not in data:
        errors.append("❌ Missing 'basic_details' section")
        return errors

    bd = data['basic_details']

    for field in required_fields:
        if field not in bd or not bd[field]:
            errors.append(f"❌ basic_details.{field} is required")

    if 'other' in bd and not isinstance(bd['other'], list):
        errors.append("❌ basic_details.other must be an array")

    return errors

def validate_product_categories(data: Dict[str, Any]) -> List[str]:
    """Validate product_categories section"""
    errors = []

    if 'product_categories' not in data:
        errors.append("⚠️  Missing 'product_categories' section (optional)")
        return errors

    categories = data['product_categories']

    if not isinstance(categories, list):
        errors.append("❌ product_categories must be an array")
        return errors

    for idx, cat in enumerate(categories):
        if 'name' not in cat or not cat['name']:
            errors.append(f"❌ product_categories[{idx}].name is required")

        if 'products' not in cat:
            errors.append(f"❌ product_categories[{idx}].products is required")
        elif not isinstance(cat['products'], list):
            errors.append(f"❌ product_categories[{idx}].products must be an array")
        else:
            for pidx, prod in enumerate(cat['products']):
                if 'name' not in prod or not prod['name']:
                    errors.append(f"❌ product_categories[{idx}].products[{pidx}].name is required")

                # Check textile fields exist (can be empty)
                expected = ['gsm', 'fabric_type', 'color', 'size_range', 'moq', 'description', 'other']
                for field in expected:
                    if field not in prod:
                        errors.append(f"⚠️  product_categories[{idx}].products[{pidx}].{field} is missing")

    return errors

def validate_infrastructure(data: Dict[str, Any]) -> List[str]:
    """Validate infrastructure_items section with category_capacities"""
    errors = []

    if 'infrastructure_items' not in data:
        errors.append("⚠️  Missing 'infrastructure_items' section (optional)")
        return errors

    items = data['infrastructure_items']

    if not isinstance(items, list):
        errors.append("❌ infrastructure_items must be an array")
        return errors

    for idx, item in enumerate(items):
        if 'name' not in item or not item['name']:
            errors.append(f"❌ infrastructure_items[{idx}].name is required")

        # Check for new format (category_capacities)
        if 'category_capacities' in item:
            if not isinstance(item['category_capacities'], list):
                errors.append(f"❌ infrastructure_items[{idx}].category_capacities must be an array")
            else:
                for ccidx, cc in enumerate(item['category_capacities']):
                    if 'category' not in cc:
                        errors.append(f"❌ infrastructure_items[{idx}].category_capacities[{ccidx}].category is required")
                    if 'capacity' not in cc:
                        errors.append(f"❌ infrastructure_items[{idx}].category_capacities[{ccidx}].capacity is required")

        # Warn if using old format
        if 'details' in item:
            errors.append(f"⚠️  infrastructure_items[{idx}] uses old 'details' format. Use flat structure with category_capacities instead")
        if 'tagged_categories' in item:
            errors.append(f"⚠️  infrastructure_items[{idx}] uses old 'tagged_categories'. Use category_capacities instead")

    return errors

def validate_compliance(data: Dict[str, Any]) -> List[str]:
    """Validate compliance section"""
    errors = []

    if 'compliance' not in data:
        errors.append("⚠️  Missing 'compliance' section (optional)")
        return errors

    comp = data['compliance']

    if 'certifications' in comp and not isinstance(comp['certifications'], list):
        errors.append("❌ compliance.certifications must be an array")

    if 'other' in comp and not isinstance(comp['other'], list):
        errors.append("❌ compliance.other must be an array")

    return errors

def validate_profile(file_path: str) -> bool:
    """Main validation function"""
    print(f"\n🔍 Validating profile schema: {file_path}\n")
    print("=" * 60)

    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        return False

    all_errors = []

    # Validate each section
    all_errors.extend(validate_basic_details(data))
    all_errors.extend(validate_product_categories(data))
    all_errors.extend(validate_infrastructure(data))
    all_errors.extend(validate_compliance(data))

    # Print results
    if not all_errors:
        print("✅ Schema validation passed!")
        print("\n📊 Summary:")
        print(f"   - Categories: {len(data.get('product_categories', []))}")
        total_products = sum(len(cat.get('products', [])) for cat in data.get('product_categories', []))
        print(f"   - Total Products: {total_products}")
        print(f"   - Infrastructure: {len(data.get('infrastructure_items', []))}")
        certs = len(data.get('compliance', {}).get('certifications', []))
        print(f"   - Certifications: {certs}")
        print("\n✨ Ready to import!")
        return True
    else:
        critical_errors = [e for e in all_errors if e.startswith("❌")]
        warnings = [e for e in all_errors if e.startswith("⚠️")]

        if critical_errors:
            print("❌ CRITICAL ERRORS:")
            for err in critical_errors:
                print(f"   {err}")

        if warnings:
            print("\n⚠️  WARNINGS:")
            for warn in warnings:
                print(f"   {warn}")

        print(f"\n📊 Total issues: {len(critical_errors)} errors, {len(warnings)} warnings")
        return len(critical_errors) == 0

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_profile_schema.py <profile.json>")
        sys.exit(1)

    success = validate_profile(sys.argv[1])
    sys.exit(0 if success else 1)
