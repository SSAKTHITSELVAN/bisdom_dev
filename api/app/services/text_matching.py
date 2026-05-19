"""
Text-based matching using TF-IDF for comparing requirements against supplier profiles.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


def clean_text(text: str) -> str:
    """Clean and normalize text for matching."""
    if not text:
        return ""

    # Convert to lowercase
    text = text.lower()

    # Remove markdown symbols
    text = re.sub(r'[*#\-_]', ' ', text)

    # Remove URLs
    text = re.sub(r'http[s]?://\S+', '', text)

    # Remove special characters but keep spaces
    text = re.sub(r'[^\w\s]', ' ', text)

    # Remove extra whitespace
    text = ' '.join(text.split())

    return text


def extract_keywords(text: str, top_n: int = 50) -> List[str]:
    """Extract important keywords from text."""
    if not text:
        return []

    # Common stop words to remove
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
        'that', 'these', 'those', 'http', 'https', 'www', 'com', 'html',
        'piece', 'pieces', 'price', 'moq', 'product', 'source', 'page'
    }

    # Clean text
    cleaned = clean_text(text)

    # Split into words
    words = cleaned.split()

    # Filter out stop words and short words
    keywords = [w for w in words if len(w) > 2 and w not in stop_words]

    # Count frequencies
    freq = {}
    for word in keywords:
        freq[word] = freq.get(word, 0) + 1

    # Sort by frequency and return top N
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, count in sorted_words[:top_n]]


def calculate_text_similarity(
    requirement_text: str,
    profile_text: str,
    use_tfidf: bool = True
) -> float:
    """
    Calculate similarity score between requirement and profile text.

    Args:
        requirement_text: The buyer's requirement description
        profile_text: The supplier's profile markdown
        use_tfidf: If True, use TF-IDF, otherwise use simple keyword matching

    Returns:
        Similarity score from 0 to 100
    """
    if not requirement_text or not profile_text:
        return 0.0

    # Clean texts
    req_clean = clean_text(requirement_text)
    profile_clean = clean_text(profile_text)

    if not req_clean or not profile_clean:
        return 0.0

    try:
        if use_tfidf:
            # Use TF-IDF vectorization
            vectorizer = TfidfVectorizer(
                max_features=100,
                ngram_range=(1, 2),  # unigrams and bigrams
                min_df=1,
                stop_words='english'
            )

            # Fit and transform both texts
            tfidf_matrix = vectorizer.fit_transform([req_clean, profile_clean])

            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

            # Convert to 0-100 scale
            score = similarity * 100

        else:
            # Simple keyword matching as fallback
            req_keywords = set(extract_keywords(req_clean, top_n=20))
            profile_keywords = set(extract_keywords(profile_clean, top_n=50))

            if not req_keywords:
                return 0.0

            # Calculate overlap
            common = req_keywords & profile_keywords
            score = (len(common) / len(req_keywords)) * 100

        logger.info(f"Text similarity calculated: {score:.2f}% "
                   f"(method: {'TF-IDF' if use_tfidf else 'keyword'})")

        return min(score, 100.0)

    except Exception as e:
        logger.error(f"Error calculating text similarity: {e}")
        # Fallback to simple keyword matching
        return calculate_text_similarity(requirement_text, profile_text, use_tfidf=False)


def build_requirement_text(requirement: dict) -> str:
    """Build searchable text from requirement dict."""
    parts = []

    # Product name (most important)
    if requirement.get("product"):
        parts.append(requirement["product"])
        parts.append(requirement["product"])  # Add twice for weight

    # Specifications
    if requirement.get("specifications"):
        specs = requirement["specifications"]
        if isinstance(specs, dict):
            for key, value in specs.items():
                parts.append(f"{key} {value}")
        elif isinstance(specs, str):
            parts.append(specs)

    # Delivery location
    if requirement.get("delivery_location"):
        parts.append(requirement["delivery_location"])

    # Quantity and unit
    if requirement.get("quantity") and requirement.get("quantity_unit"):
        parts.append(f"{requirement['quantity']} {requirement['quantity_unit']}")

    # Budget
    if requirement.get("budget_max"):
        parts.append(f"budget {requirement['budget_max']}")

    # Order type
    if requirement.get("order_type"):
        parts.append(requirement["order_type"])

    return " ".join(parts)


def build_profile_text(profile_md: str, location: str = None, categories: List[str] = None) -> str:
    """Build searchable text from profile components."""
    parts = []

    # Profile markdown (most important)
    if profile_md:
        parts.append(profile_md)

    # Location
    if location:
        parts.append(location)
        parts.append(location)  # Add twice for weight

    # Categories
    if categories:
        for cat in categories:
            parts.append(cat)
            parts.append(cat)  # Add twice for weight

    return " ".join(parts)


def extract_product_names(profile_md: str) -> List[str]:
    """Extract product names from profile markdown."""
    if not profile_md:
        return []

    products = []

    # Look for patterns like "#### 1. Product Name" or "### Product Name"
    patterns = [
        r'####\s*\d*\.?\s*([A-Za-z\s]+)',  # #### 1. Men Plain T Shirt
        r'###\s*\d*\)?\s*([A-Za-z\s]+)',   # ### 1) Mens T Shirt Collection
        r'-\s*Supplier:\s*([A-Za-z\s]+)',  # - Supplier: Define Clothing
        r'Product:\s*([A-Za-z\s]+)',       # Product: Cotton T-Shirts
    ]

    for pattern in patterns:
        matches = re.findall(pattern, profile_md)
        products.extend([m.strip() for m in matches if len(m.strip()) > 3])

    return products[:20]  # Return top 20 product names


def calculate_enhanced_match_score(
    requirement: dict,
    profile_md: str,
    location: str = None,
    categories: List[str] = None,
    pricing_available: bool = False
) -> Tuple[float, List[str]]:
    """
    Calculate enhanced match score using TF-IDF text similarity.

    Returns:
        (score, match_reasons) - Score from 0-100 and list of match reasons
    """
    match_reasons = []

    # Build searchable texts
    req_text = build_requirement_text(requirement)
    profile_text = build_profile_text(profile_md, location, categories)

    # Calculate TF-IDF similarity (main score)
    text_similarity = calculate_text_similarity(req_text, profile_text)

    # Start with text similarity as base
    score = text_similarity * 0.7  # 70% weight on text similarity

    if text_similarity > 50:
        match_reasons.append(f"High text similarity: {text_similarity:.0f}%")
    elif text_similarity > 30:
        match_reasons.append(f"Moderate text similarity: {text_similarity:.0f}%")

    # Bonus for location match (15% weight)
    req_location = (requirement.get("delivery_location") or "").lower()
    if req_location and location:
        location_lower = location.lower()
        if req_location in location_lower or location_lower in req_location:
            score += 15
            match_reasons.append(f"Location match: {location}")

    # Bonus for having pricing (5% weight)
    if pricing_available:
        score += 5
        match_reasons.append("Pricing information available")

    # Bonus for having categories (5% weight)
    if categories and len(categories) > 0:
        score += 5
        match_reasons.append(f"Product categories: {len(categories)} listed")

    # Bonus for product name exact matches (5% weight)
    if profile_md:
        product_names = extract_product_names(profile_md)
        req_product = (requirement.get("product") or "").lower()

        if req_product:
            for product_name in product_names:
                if req_product in product_name.lower() or product_name.lower() in req_product:
                    score += 5
                    match_reasons.append(f"Product match: {product_name}")
                    break

    # Cap at 100
    score = min(score, 100.0)

    return score, match_reasons
