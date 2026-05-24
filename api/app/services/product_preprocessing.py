"""
Product Preprocessing Service - STEP 1 of Efficient Matching

Extracts, normalizes, and generates embeddings for supplier products.
Runs ONCE when profile is created/updated, not on every search.

This preprocessing enables:
- Fast SQL-based hard filtering
- Semantic search with pre-computed embeddings
- Normalized field matching
"""
import re
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sentence_transformers import SentenceTransformer
import numpy as np

from app.models.supplier_product import SupplierProduct
from app.models.user_config import UserConfig
from app.models.profile import AgenticProfile

logger = logging.getLogger(__name__)

# Global model instance (loaded once at startup)
_embedding_model: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    """Get or load the sentence transformer model (singleton)."""
    global _embedding_model
    if _embedding_model is None:
        logger.info("[PREPROCESS] Loading sentence-transformers model: all-MiniLM-L6-v2")
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("[PREPROCESS] Model loaded successfully")
    return _embedding_model


def infer_product_type(product_name: str, category: str = "") -> str:
    """Infer product type from name and category."""
    text = f"{product_name} {category}".lower()

    # Textile/Garments
    if any(kw in text for kw in ['tshirt', 't-shirt', 't shirt', 'tee']):
        return 'tshirt'
    if any(kw in text for kw in ['shirt', 'polo']):
        return 'shirt'
    if any(kw in text for kw in ['pant', 'trouser', 'jeans']):
        return 'pants'
    if any(kw in text for kw in ['fabric', 'cloth', 'textile']):
        return 'fabric'

    # Chemicals
    if any(kw in text for kw in ['chemical', 'acid', 'alkali', 'sodium', 'sulfuric']):
        return 'chemical'

    # Electronics
    if any(kw in text for kw in ['led', 'bulb', 'light', 'electronic', 'circuit']):
        return 'electronics'

    # Packaging
    if any(kw in text for kw in ['box', 'carton', 'packaging', 'container']):
        return 'packaging'

    # Food
    if any(kw in text for kw in ['food', 'spice', 'grain', 'powder', 'edible']):
        return 'food'

    # Construction
    if any(kw in text for kw in ['cement', 'steel', 'brick', 'construction']):
        return 'construction'

    return 'general'


def extract_material(text: str) -> Optional[str]:
    """Extract primary material from text."""
    if not text:
        return None

    text = text.lower()

    # Common materials
    materials = {
        'cotton': ['cotton', '100% cotton', 'pure cotton'],
        'polyester': ['polyester', 'poly', 'pet'],
        'blend': ['blend', 'mixed', 'cotton polyester'],
        'steel': ['steel', 'stainless', 'iron'],
        'plastic': ['plastic', 'polypropylene', 'hdpe', 'ldpe'],
        'aluminum': ['aluminum', 'aluminium'],
        'wood': ['wood', 'wooden', 'timber'],
        'paper': ['paper', 'cardboard', 'corrugated'],
    }

    for material, keywords in materials.items():
        if any(kw in text for kw in keywords):
            return material

    return None


def extract_gsm(text: str) -> Optional[int]:
    """Extract GSM value from text."""
    if not text:
        return None

    # Look for pattern like "180 gsm" or "gsm 180" or "180gsm"
    match = re.search(r'(\d+)\s*gsm|gsm\s*(\d+)', text.lower())
    if match:
        gsm_str = match.group(1) or match.group(2)
        try:
            gsm = int(gsm_str)
            if 50 <= gsm <= 1000:  # Reasonable range for textiles
                return gsm
        except ValueError:
            pass

    return None


def extract_price_range(price_text: str) -> tuple[Optional[float], Optional[float]]:
    """Extract min and max price from text like '₹200-250/piece' or '₹150 per kg'."""
    if not price_text:
        return None, None

    # Remove currency symbols
    text = re.sub(r'[₹$€£]', '', str(price_text))

    # Look for range pattern: 200-250
    range_match = re.search(r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)', text)
    if range_match:
        try:
            min_price = float(range_match.group(1))
            max_price = float(range_match.group(2))
            return min_price, max_price
        except ValueError:
            pass

    # Look for single price
    single_match = re.search(r'(\d+(?:\.\d+)?)', text)
    if single_match:
        try:
            price = float(single_match.group(1))
            return price, price
        except ValueError:
            pass

    return None, None


def extract_moq(moq_text: str) -> Optional[int]:
    """Extract MOQ from text like '500 pieces' or 'minimum 100'."""
    if not moq_text:
        return None

    # Look for number followed by unit
    match = re.search(r'(\d+)\s*(?:pieces|pcs|pc|units|kg|meters|m)', str(moq_text).lower())
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass

    # Fallback: just get first number
    match = re.search(r'(\d+)', str(moq_text))
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass

    return None


def normalize_product(product_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a product dictionary into structured fields."""
    name = product_dict.get("name", "")
    fabric_type = product_dict.get("fabric_type", "")
    description = product_dict.get("description", "")

    # Combine all text for analysis
    combined_text = f"{name} {fabric_type} {description}"

    # Infer product type
    product_type = infer_product_type(name, fabric_type)

    # Extract material
    material = extract_material(combined_text)

    # Extract GSM
    gsm = extract_gsm(combined_text)

    # Extract price
    price_text = product_dict.get("price", "")
    price_min, price_max = extract_price_range(price_text)

    # Extract MOQ
    moq_text = product_dict.get("moq", "")
    moq = extract_moq(moq_text)

    return {
        "name": name,
        "product_type": product_type,
        "material": material,
        "gsm": gsm,
        "fabric_type": fabric_type or None,
        "description": description or None,
        "price_min": price_min,
        "price_max": price_max,
        "moq": moq,
        "raw_data": product_dict,
    }


def build_embedding_text(normalized_product: Dict[str, Any]) -> str:
    """Build text for embedding generation."""
    parts = []

    # Product name (most important)
    if normalized_product.get("name"):
        parts.append(normalized_product["name"])
        parts.append(normalized_product["name"])  # Add twice for emphasis

    # Material
    if normalized_product.get("material"):
        parts.append(normalized_product["material"])

    # Fabric type
    if normalized_product.get("fabric_type"):
        parts.append(normalized_product["fabric_type"])

    # Description
    if normalized_product.get("description"):
        parts.append(normalized_product["description"][:200])  # Limit length

    # GSM
    if normalized_product.get("gsm"):
        parts.append(f"{normalized_product['gsm']} gsm")

    # Product type
    if normalized_product.get("product_type"):
        parts.append(normalized_product["product_type"])

    return " ".join(parts)


def extract_products_from_profile_json(profile_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract all products from profile JSON structure."""
    products = []

    if not profile_json or not isinstance(profile_json, dict):
        return products

    # Get product categories
    categories = profile_json.get("product_categories", [])

    for category in categories:
        if not isinstance(category, dict):
            continue

        category_products = category.get("products", [])
        for product in category_products:
            if isinstance(product, dict):
                products.append(product)

    return products


async def preprocess_supplier_products(
    user_id: int,
    db: AsyncSession,
    force_refresh: bool = False
) -> int:
    """
    Main preprocessing function - extracts and normalizes supplier products.

    Args:
        user_id: Supplier user ID
        db: Database session
        force_refresh: If True, delete existing products and reprocess

    Returns:
        Number of products processed
    """
    logger.info(f"[PREPROCESS] Starting preprocessing for supplier user #{user_id}")

    # Get supplier profile
    profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()

    if not profile:
        logger.warning(f"[PREPROCESS] No profile found for user #{user_id}")
        return 0

    # Get user config (profile_json)
    config_result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == user_id)
    )
    user_config = config_result.scalar_one_or_none()

    if not user_config or not user_config.profile_json:
        logger.warning(f"[PREPROCESS] No profile_json found for user #{user_id}")
        return 0

    # Delete existing products if force refresh
    if force_refresh:
        await db.execute(
            delete(SupplierProduct).where(SupplierProduct.supplier_id == user_id)
        )
        logger.info(f"[PREPROCESS] Deleted existing products for user #{user_id}")

    # Extract products
    raw_products = extract_products_from_profile_json(user_config.profile_json)

    if not raw_products:
        logger.warning(f"[PREPROCESS] No products found in profile_json for user #{user_id}")
        return 0

    logger.info(f"[PREPROCESS] Found {len(raw_products)} products to process")

    # Load embedding model
    model = get_embedding_model()

    # Build supplier location
    supplier_location = None
    supplier_state = None
    if profile.city and profile.state:
        supplier_location = f"{profile.city}, {profile.state}"
        supplier_state = profile.state
    elif profile.state:
        supplier_location = profile.state
        supplier_state = profile.state
    elif profile.city:
        supplier_location = profile.city

    # Process each product
    processed_count = 0

    for raw_product in raw_products:
        try:
            # Normalize
            normalized = normalize_product(raw_product)

            # Generate embedding
            embedding_text = build_embedding_text(normalized)
            embedding_vector = model.encode(embedding_text)
            embedding_list = embedding_vector.tolist()

            # Create database record
            db_product = SupplierProduct(
                supplier_id=user_id,
                product_name=normalized["name"],
                product_type=normalized["product_type"],
                material=normalized["material"],
                gsm=normalized["gsm"],
                fabric_type=normalized.get("fabric_type"),
                description=normalized.get("description"),
                price_min=normalized.get("price_min"),
                price_max=normalized.get("price_max"),
                moq=normalized.get("moq"),
                supplier_location=supplier_location,
                supplier_state=supplier_state,
                embedding=embedding_list,
                specifications=normalized.get("raw_data"),
            )

            db.add(db_product)
            processed_count += 1

        except Exception as e:
            logger.error(f"[PREPROCESS] Error processing product {raw_product.get('name', 'unknown')}: {e}")
            continue

    await db.flush()

    logger.info(f"[PREPROCESS] Successfully preprocessed {processed_count} products for user #{user_id}")

    return processed_count
