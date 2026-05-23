"""
Hybrid Matching Algorithm - Combines multiple matching strategies for better accuracy.

Solves the problem where TF-IDF gives low scores for profiles with many products
containing the requested terms (terms become "common" and get low IDF scores).

Strategy:
1. Product Name Matching (40%) - Direct product name comparison
2. Keyword Matching (25%) - Important term overlap
3. Price & MOQ Compatibility (20%) - Numeric range matching
4. TF-IDF Context (15%) - Semantic similarity (reduced weight)
"""
import re
import logging
from typing import List, Tuple, Dict, Any
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


def normalize_product_name(name: str) -> str:
    """Normalize product names for comparison."""
    if not name:
        return ""

    # Convert to lowercase
    name = name.lower()

    # Remove special characters
    name = re.sub(r'[^\w\s]', ' ', name)

    # Remove extra whitespace
    name = ' '.join(name.split())

    # Remove common prefixes/suffixes
    remove_words = ['mens', 'womens', 'unisex', 'plain', 'printed', 'customized']
    words = name.split()
    words = [w for w in words if w not in remove_words]

    return ' '.join(words)


def calculate_string_similarity(str1: str, str2: str) -> float:
    """Calculate similarity between two strings (0-100)."""
    if not str1 or not str2:
        return 0.0

    # Normalize
    s1 = normalize_product_name(str1)
    s2 = normalize_product_name(str2)

    if not s1 or not s2:
        return 0.0

    # Use SequenceMatcher for similarity
    ratio = SequenceMatcher(None, s1, s2).ratio()

    # Also check if one contains the other
    if s1 in s2 or s2 in s1:
        ratio = max(ratio, 0.8)

    # Check word overlap
    words1 = set(s1.split())
    words2 = set(s2.split())
    if words1 and words2:
        word_overlap = len(words1 & words2) / len(words1 | words2)
        ratio = max(ratio, word_overlap)

    return ratio * 100


def extract_products_from_profile(profile_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract all products from profile JSON."""
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
                products.append({
                    "name": product.get("name", ""),
                    "fabric_type": product.get("fabric_type", ""),
                    "price": product.get("price", ""),
                    "moq": product.get("moq", ""),
                    "gsm": product.get("gsm", ""),
                    "description": product.get("description", ""),
                })

    return products


def extract_price_from_text(text: str) -> float:
    """Extract numeric price from text like '₹200/piece' or '200 rupees'."""
    if not text:
        return 0.0

    # Remove currency symbols and extract numbers
    numbers = re.findall(r'(\d+(?:\.\d+)?)', str(text))
    if numbers:
        return float(numbers[0])
    return 0.0


def extract_moq_from_text(text: str) -> int:
    """Extract MOQ from text like '500 pieces' or '10 units'."""
    if not text:
        return 0

    # Look for number followed by 'pieces', 'units', etc.
    match = re.search(r'(\d+)\s*(?:pieces|units|pcs|pc)', str(text), re.IGNORECASE)
    if match:
        return int(match.group(1))

    # Fallback: just get first number
    numbers = re.findall(r'(\d+)', str(text))
    if numbers:
        return int(numbers[0])

    return 0


def calculate_product_name_score(
    requirement_product: str,
    profile_products: List[Dict[str, Any]]
) -> Tuple[float, List[str]]:
    """
    Calculate score based on product name matching.
    Returns (score 0-100, list of matching products)
    """
    if not requirement_product or not profile_products:
        return 0.0, []

    req_normalized = normalize_product_name(requirement_product)
    req_words = set(req_normalized.split())

    matches = []
    best_similarity = 0.0
    matching_products = []

    for product in profile_products:
        product_name = product.get("name", "")
        if not product_name:
            continue

        # Calculate similarity
        similarity = calculate_string_similarity(requirement_product, product_name)

        # Also check fabric type (e.g., "cotton" requirement vs "cotton" fabric)
        fabric_type = product.get("fabric_type", "").lower()
        if req_normalized in fabric_type or any(word in fabric_type for word in req_words):
            similarity = max(similarity, 60.0)

        # Also check description
        description = product.get("description", "").lower()
        if req_normalized in description or any(word in description for word in req_words if len(word) > 3):
            similarity = max(similarity, 50.0)

        matches.append((similarity, product_name))

        if similarity > best_similarity:
            best_similarity = similarity

        if similarity >= 40:  # Threshold for "matching"
            matching_products.append(f"{product_name} ({similarity:.0f}%)")

    # Score is best match, with bonus for multiple matches
    score = best_similarity
    if len([m for m in matches if m[0] >= 40]) > 3:
        score = min(100, score + 10)  # Bonus for having multiple matching products

    return score, matching_products[:5]  # Return top 5 matches


def calculate_keyword_score(
    requirement: Dict[str, Any],
    profile_products: List[Dict[str, Any]]
) -> Tuple[float, List[str]]:
    """
    Calculate score based on keyword matching.
    Returns (score 0-100, list of keywords found)
    """
    # Extract key terms from requirement
    req_product = requirement.get("product", "").lower()
    req_specs = requirement.get("specifications", {})

    # Build requirement keywords
    req_keywords = set(req_product.split())

    # Add specification keywords
    if isinstance(req_specs, dict):
        for key, value in req_specs.items():
            req_keywords.add(str(key).lower())
            req_keywords.add(str(value).lower())

    # Remove common stopwords
    stopwords = {'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'to'}
    req_keywords = {w for w in req_keywords if w not in stopwords and len(w) > 2}

    if not req_keywords:
        return 0.0, []

    # Check products for keyword presence
    found_keywords = set()
    keyword_counts = {kw: 0 for kw in req_keywords}

    for product in profile_products:
        # Combine all product text
        product_text = " ".join([
            product.get("name", ""),
            product.get("fabric_type", ""),
            product.get("description", ""),
        ]).lower()

        for keyword in req_keywords:
            if keyword in product_text:
                found_keywords.add(keyword)
                keyword_counts[keyword] += 1

    # Calculate score
    if not req_keywords:
        return 0.0, []

    match_ratio = len(found_keywords) / len(req_keywords)
    score = match_ratio * 100

    # Bonus for keywords that appear in multiple products (shows specialization)
    frequent_keywords = [kw for kw, count in keyword_counts.items() if count >= 3]
    if frequent_keywords:
        score = min(100, score + 10)

    keywords_list = [f"{kw} ({keyword_counts[kw]}x)" for kw in found_keywords]

    return score, keywords_list


def calculate_price_moq_score(
    requirement: Dict[str, Any],
    profile_products: List[Dict[str, Any]]
) -> Tuple[float, List[str]]:
    """
    Calculate score based on price and MOQ compatibility.
    Returns (score 0-100, list of compatible products)
    """
    req_quantity = requirement.get("quantity", 0)
    req_budget = requirement.get("budget_max", 0)

    if req_quantity == 0 or req_budget == 0:
        return 50.0, ["Price/MOQ not specified in requirement"]  # Neutral score

    compatible_products = []
    price_matches = 0
    moq_matches = 0

    for product in profile_products:
        product_name = product.get("name", "")

        # Extract price
        product_price = extract_price_from_text(product.get("price", ""))

        # Extract MOQ
        product_moq = extract_moq_from_text(product.get("moq", ""))

        # Check price compatibility
        price_compatible = False
        if product_price > 0:
            if product_price <= req_budget * 1.2:  # Allow 20% over budget
                price_compatible = True
                price_matches += 1

        # Check MOQ compatibility
        moq_compatible = False
        if product_moq > 0:
            if product_moq <= req_quantity * 1.5:  # Allow MOQ up to 1.5x quantity
                moq_compatible = True
                moq_matches += 1

        # Track compatible products
        if price_compatible or moq_compatible:
            compat_notes = []
            if price_compatible:
                compat_notes.append(f"₹{product_price:.0f}")
            if moq_compatible:
                compat_notes.append(f"MOQ:{product_moq}")

            compatible_products.append(f"{product_name[:30]}... ({', '.join(compat_notes)})")

    # Calculate score
    total_products = len(profile_products)
    if total_products == 0:
        return 50.0, []

    price_ratio = price_matches / total_products
    moq_ratio = moq_matches / total_products

    # Combined score (weighted average)
    score = (price_ratio * 0.6 + moq_ratio * 0.4) * 100

    return score, compatible_products[:5]


def calculate_hybrid_match_score(
    requirement: Dict[str, Any],
    profile_json: Dict[str, Any],
    location: str = None,
    tfidf_score: float = 0.0
) -> Tuple[float, List[str]]:
    """
    Calculate hybrid match score combining multiple strategies.

    Weights:
    - Product Name Matching: 40%
    - Keyword Matching: 25%
    - Price & MOQ Compatibility: 20%
    - TF-IDF Context: 15%

    Args:
        requirement: Requirement dict
        profile_json: Supplier profile JSON
        location: Supplier location (for location bonus)
        tfidf_score: Pre-calculated TF-IDF score (0-100)

    Returns:
        (total_score, match_reasons)
    """
    match_reasons = []

    # Extract products from profile
    products = extract_products_from_profile(profile_json)

    if not products:
        logger.warning("[HYBRID] No products found in profile JSON")
        return tfidf_score * 0.15, ["Using TF-IDF only (no product data)"]

    logger.info(f"[HYBRID] Analyzing {len(products)} products from profile")

    # 1. Product Name Matching (40%)
    req_product = requirement.get("product", "")
    product_score, product_matches = calculate_product_name_score(req_product, products)

    logger.info(f"[HYBRID] Product name score: {product_score:.1f}%")
    if product_matches:
        match_reasons.append(f"Product matches: {', '.join(product_matches[:3])}")

    # 2. Keyword Matching (25%)
    keyword_score, keywords_found = calculate_keyword_score(requirement, products)

    logger.info(f"[HYBRID] Keyword score: {keyword_score:.1f}%")
    if keywords_found:
        match_reasons.append(f"Keywords found: {', '.join(keywords_found[:3])}")

    # 3. Price & MOQ Compatibility (20%)
    price_moq_score, compatible_products = calculate_price_moq_score(requirement, products)

    logger.info(f"[HYBRID] Price/MOQ score: {price_moq_score:.1f}%")
    if compatible_products:
        match_reasons.append(f"Price/MOQ compatible: {len(compatible_products)} products")

    # 4. TF-IDF Context (15%)
    logger.info(f"[HYBRID] TF-IDF score: {tfidf_score:.1f}%")

    # Calculate weighted total
    total_score = (
        product_score * 0.40 +
        keyword_score * 0.25 +
        price_moq_score * 0.20 +
        tfidf_score * 0.15
    )

    # Location bonus (extra 10%)
    if location:
        req_location = requirement.get("delivery_location", "").lower()
        if req_location and location.lower():
            if req_location in location.lower() or location.lower() in req_location:
                total_score = min(100, total_score + 10)
                match_reasons.append(f"Location match: {location}")

    # Cap at 100
    total_score = min(100, total_score)

    logger.info(f"[HYBRID] Final hybrid score: {total_score:.1f}%")
    logger.info(f"[HYBRID] Breakdown: Product={product_score:.0f}%, "
               f"Keyword={keyword_score:.0f}%, Price/MOQ={price_moq_score:.0f}%, "
               f"TF-IDF={tfidf_score:.0f}%")

    # Add score breakdown to reasons
    match_reasons.insert(0, f"Hybrid score: Product({product_score:.0f}%) + "
                            f"Keywords({keyword_score:.0f}%) + "
                            f"Price/MOQ({price_moq_score:.0f}%) + "
                            f"TF-IDF({tfidf_score:.0f}%)")

    return total_score, match_reasons
