"""
Robust Preprocessing Script - Parses profile_md (markdown) directly
Works without circular import issues by using raw SQL queries
"""
import asyncio
import logging
import re
import json
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    logger.warning("sentence-transformers not available, will skip embeddings")
    EMBEDDINGS_AVAILABLE = False

import psycopg2
from psycopg2.extras import Json

# Database connection
DB_CONFIG = {
    'host': 'bizzapdb.c3iya6wc0708.ap-south-1.rds.amazonaws.com',
    'user': 'postgres',
    'password': 'bizzap123',
    'database': 'bizzap_v1_db'
}

# Global model
_model = None

def get_model():
    """Load embedding model once."""
    global _model
    if _model is None and EMBEDDINGS_AVAILABLE:
        logger.info("Loading sentence-transformers model...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Model loaded successfully")
    return _model


def parse_products_from_markdown(profile_md: str) -> List[Dict[str, Any]]:
    """Extract products from markdown profile."""
    products = []

    if not profile_md:
        return products

    # Pattern 1: #### Product Name format
    pattern1 = r'####\s+\d*\.?\s*([^\n]+)\n(.*?)(?=####|$)'
    matches = re.findall(pattern1, profile_md, re.DOTALL)

    for product_name, details in matches:
        product_name = product_name.strip()
        if len(product_name) < 3:
            continue

        product = {
            'name': product_name,
            'details': details.strip()
        }

        # Extract specifications from details
        # Price
        price_match = re.search(r'₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:-|to)?\s*₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)?.*?(?:per|/)\s*(\w+)', details, re.IGNORECASE)
        if price_match:
            price1 = float(price_match.group(1).replace(',', ''))
            price2 = price_match.group(2)
            if price2:
                price2 = float(price2.replace(',', ''))
                product['price_min'] = min(price1, price2)
                product['price_max'] = max(price1, price2)
            else:
                product['price_min'] = price1
                product['price_max'] = price1
            product['price_unit'] = price_match.group(3)

        # MOQ
        moq_match = re.search(r'(?:MOQ|Minimum|Min).*?(\d+(?:,\d+)*)\s*(\w+)', details, re.IGNORECASE)
        if moq_match:
            product['moq'] = int(moq_match.group(1).replace(',', ''))
            product['moq_unit'] = moq_match.group(2)

        # Material
        materials = ['cotton', 'polyester', 'blend', 'wool', 'silk', 'linen', 'denim']
        for mat in materials:
            if mat in details.lower() or mat in product_name.lower():
                product['material'] = mat
                break

        # GSM
        gsm_match = re.search(r'(\d+)\s*(?:GSM|gsm)', details)
        if gsm_match:
            product['gsm'] = int(gsm_match.group(1))

        products.append(product)

    # Pattern 2: Product lines with Price/MOQ
    pattern2 = r'(?:^|\n)\*?\*?([A-Z][^\n:]{10,80}?):\s*₹?(\d+).*?MOQ.*?(\d+)'
    matches2 = re.findall(pattern2, profile_md, re.MULTILINE)

    for product_name, price, moq in matches2:
        if any(p['name'].lower() == product_name.lower() for p in products):
            continue

        products.append({
            'name': product_name.strip(),
            'price_min': float(price),
            'price_max': float(price),
            'moq': int(moq),
            'details': ''
        })

    return products


def infer_product_type(name: str, details: str = '') -> str:
    """Infer product type from name/details."""
    text = (name + ' ' + details).lower()

    if any(kw in text for kw in ['tshirt', 't-shirt', 't shirt', 'tee']):
        return 'tshirt'
    if any(kw in text for kw in ['shirt', 'polo', 'formal']):
        return 'shirt'
    if any(kw in text for kw in ['pant', 'trouser', 'jeans']):
        return 'pants'
    if any(kw in text for kw in ['fabric', 'cloth', 'textile', 'material']):
        return 'fabric'

    return 'garment'


def build_embedding_text(product: Dict[str, Any]) -> str:
    """Build text for embedding."""
    parts = [product['name'], product['name']]  # Name twice for emphasis

    if product.get('material'):
        parts.append(product['material'])
    if product.get('gsm'):
        parts.append(f"{product['gsm']} gsm")
    if product.get('details'):
        parts.append(product['details'][:200])

    return ' '.join(parts)


def preprocess_supplier(conn, user_id: int, trade_name: str, profile_md: str,
                       location: str, state: str, force_refresh: bool = True):
    """Preprocess a single supplier."""
    cur = conn.cursor()

    try:
        # Delete existing products if force refresh
        if force_refresh:
            cur.execute("DELETE FROM supplier_products WHERE supplier_id = %s", (user_id,))
            logger.info(f"  Deleted existing products for user #{user_id}")

        # Parse products from markdown
        products = parse_products_from_markdown(profile_md)

        if not products:
            logger.warning(f"  No products found in markdown for user #{user_id}")
            return 0

        logger.info(f"  Found {len(products)} products in markdown")

        # Get embedding model
        model = get_model() if EMBEDDINGS_AVAILABLE else None

        # Insert products
        inserted = 0
        for product in products:
            try:
                # Infer product type
                product_type = infer_product_type(product['name'], product.get('details', ''))

                # Generate embedding
                embedding = None
                if model:
                    embedding_text = build_embedding_text(product)
                    embedding_vector = model.encode(embedding_text)
                    embedding = Json(embedding_vector.tolist())
                else:
                    embedding = Json([])  # Empty array if no model

                # Insert
                cur.execute("""
                    INSERT INTO supplier_products (
                        supplier_id, product_name, product_type, material, gsm,
                        price_min, price_max, price_unit, moq, moq_unit,
                        description, supplier_location, supplier_state, embedding,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        NOW(), NOW()
                    )
                """, (
                    user_id,
                    product['name'],
                    product_type,
                    product.get('material'),
                    product.get('gsm'),
                    product.get('price_min'),
                    product.get('price_max'),
                    product.get('price_unit', 'INR per piece'),
                    product.get('moq'),
                    product.get('moq_unit', 'pieces'),
                    product.get('details', '')[:500],  # Limit description length
                    location,
                    state,
                    embedding
                ))

                inserted += 1

            except Exception as e:
                logger.error(f"    Error inserting product '{product.get('name', 'unknown')}': {e}")
                continue

        conn.commit()
        logger.info(f"  ✓ Inserted {inserted} products")
        return inserted

    except Exception as e:
        conn.rollback()
        logger.error(f"  ✗ Error processing supplier: {e}")
        return 0


def main():
    """Main preprocessing function."""
    print("\n" + "="*70)
    print("  PREPROCESSING ALL SUPPLIERS FROM MARKDOWN PROFILES")
    print("="*70 + "\n")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        # Get all suppliers with profile_md
        cur.execute("""
            SELECT
                ap.user_id,
                ap.trade_name,
                uc.profile_md,
                ap.city,
                ap.state
            FROM agentic_profiles ap
            JOIN user_configs uc ON uc.user_id = ap.user_id
            WHERE uc.profile_md IS NOT NULL
              AND uc.profile_md != ''
        """)

        suppliers = cur.fetchall()

        if not suppliers:
            print("⚠️  No suppliers found with profile_md")
            print("Make sure suppliers have completed onboarding.\n")
            return

        logger.info(f"Found {len(suppliers)} suppliers with profile data\n")

        total_products = 0
        successful = 0
        failed = 0

        for user_id, trade_name, profile_md, city, state in suppliers:
            print(f"\nProcessing: {trade_name or f'User #{user_id}'}")
            print(f"  User ID: {user_id}")
            print(f"  Location: {city or ''}{', ' + state if state else ''}")

            location = None
            if city and state:
                location = f"{city}, {state}"
            elif state:
                location = state
            elif city:
                location = city

            try:
                count = preprocess_supplier(
                    conn, user_id, trade_name, profile_md,
                    location, state, force_refresh=True
                )

                if count > 0:
                    total_products += count
                    successful += 1
                else:
                    failed += 1

            except Exception as e:
                failed += 1
                logger.error(f"Failed to process user #{user_id}: {e}")
                continue

        # Print summary
        print("\n" + "="*70)
        print("  PREPROCESSING COMPLETE")
        print("="*70)
        print(f"\nTotal suppliers: {len(suppliers)}")
        print(f"Successful: {successful}")
        print(f"Failed: {failed}")
        print(f"Total products: {total_products}")

        # Verify
        cur.execute("SELECT COUNT(*) FROM supplier_products")
        db_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM supplier_products WHERE embedding IS NOT NULL AND embedding::text != '[]'")
        with_embeddings = cur.fetchone()[0]

        print(f"\n✓ Verification: {db_count} products in database")
        print(f"✓ {with_embeddings} products have embeddings")
        print("\n" + "="*70 + "\n")

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
