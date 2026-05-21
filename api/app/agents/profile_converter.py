"""
Profile JSON ↔ Markdown converter.

Maintains dual representation:
- profile_json: Source of truth for UI editing
- profile_md: Auto-generated cache for AI agents
"""


def json_to_markdown(profile_json: dict) -> str:
    """
    Convert profile JSON to markdown format for AI agents.

    Supports multiple versions:
    - V4: product_categories, infrastructure_items (latest)
    - V3: basic_details, products, infrastructure, compliance
    - V2: company, location, products (legacy)
    """
    if not profile_json:
        return ""

    # Check if it's V4 format (category-based products)
    if "product_categories" in profile_json or "infrastructure_items" in profile_json:
        return json_to_markdown_v4(profile_json)

    # Check if it's V3 format (4 sections)
    if "basic_details" in profile_json:
        return json_to_markdown_v3(profile_json)

    # Fall back to V2 format converter for backward compatibility
    return json_to_markdown_v2(profile_json)


def json_to_markdown_v4(profile_json: dict) -> str:
    """Convert V4 format (category-based products + tagged infrastructure) to markdown."""
    basic_details = profile_json.get("basic_details", {})
    product_categories = profile_json.get("product_categories", [])
    infrastructure_items = profile_json.get("infrastructure_items", [])
    compliance = profile_json.get("compliance", {})

    company_name = basic_details.get("company_name", "My Business")

    lines = [
        f"# Business Profile",
        f"## {company_name}",
        "",
        "---",
        "",
        "## 1️⃣ Basic Details",
        "",
    ]

    # Basic company info
    if basic_details.get("company_name"):
        lines.append(f"**Company Name:** {basic_details['company_name']}")
        lines.append("")
    if basic_details.get("gst_number"):
        lines.append(f"**GST Number:** `{basic_details['gst_number']}`")
        lines.append("")

    # Contact info
    if basic_details.get("phone"):
        lines.append(f"**Phone:** {basic_details['phone']}")
        lines.append("")
    if basic_details.get("email"):
        lines.append(f"**Email:** {basic_details['email']}")
        lines.append("")
    if basic_details.get("website"):
        lines.append(f"**Website:** {basic_details['website']}")
        lines.append("")

    # Address
    address_parts = []
    if basic_details.get("address"):
        address_parts.append(basic_details["address"])
    if basic_details.get("city"):
        address_parts.append(basic_details["city"])
    if basic_details.get("state"):
        address_parts.append(basic_details["state"])
    if basic_details.get("pincode"):
        address_parts.append(basic_details["pincode"])

    if address_parts:
        lines.append("**Address:**")
        lines.append(f"> {', '.join(address_parts)}")
        lines.append("")

    # Other details
    if basic_details.get("other"):
        lines.append("**Additional Info:**")
        for item in basic_details["other"]:
            lines.append(f"- {item}")
        lines.append("")

    # Section 2: Product Categories
    if product_categories:
        lines += [
            "---",
            "",
            "## 2️⃣ Product Categories",
            "",
        ]
        for cat in product_categories:
            cat_name = cat.get("name", "Unnamed Category")
            lines.append(f"### 📦 {cat_name}")
            lines.append("")

            products = cat.get("products", [])
            if products:
                for prod in products:
                    prod_name = prod.get("name", "Product")
                    lines.append(f"- **{prod_name}**")

                    # Textile-specific fields
                    if prod.get("gsm"):
                        lines.append(f"  - GSM: {prod['gsm']}")
                    if prod.get("fabric_type"):
                        lines.append(f"  - Fabric Type: {prod['fabric_type']}")
                    if prod.get("color"):
                        lines.append(f"  - Colors: {prod['color']}")
                    if prod.get("size_range"):
                        lines.append(f"  - Sizes: {prod['size_range']}")
                    if prod.get("moq"):
                        lines.append(f"  - MOQ: {prod['moq']}")
                    if prod.get("description"):
                        lines.append(f"  - Description: {prod['description']}")
                    if prod.get("other"):
                        lines.append(f"  - Other: {prod['other']}")
                lines.append("")
            else:
                lines.append("*No products in this category*")
                lines.append("")

    # Section 3: Infrastructure
    if infrastructure_items:
        lines += [
            "---",
            "",
            "## 3️⃣ Company Infrastructure",
            "",
        ]
        for item in infrastructure_items:
            item_name = item.get("name", "Infrastructure")
            lines.append(f"### 🏭 {item_name}")
            lines.append("")

            # Support both old format (details object) and new format (direct fields)
            details = item.get("details", {})
            area = item.get("area") or details.get("area")
            machines = item.get("machines") or details.get("machines")
            workforce = item.get("workforce") or details.get("workforce")

            if area:
                lines.append(f"**Area:** {area} sq ft")
            if machines:
                lines.append(f"**Machines:** {machines}")
            if workforce:
                lines.append(f"**Workforce:** {workforce}")

            # New format: Category-specific capacities
            category_capacities = item.get("category_capacities", [])
            if category_capacities:
                lines.append("")
                lines.append("**Production Capacities by Category:**")
                for cc in category_capacities:
                    if cc.get("category") and cc.get("capacity"):
                        lines.append(f"- {cc['category']}: {cc['capacity']}")

            # Old format: General capacity and tagged categories (backward compatibility)
            if details.get("capacity"):
                lines.append("")
                lines.append(f"**Production Capacity:** {details['capacity']}")

            tagged_cats = item.get("tagged_categories", [])
            if tagged_cats:
                lines.append("")
                lines.append(f"**Supports Categories:** {', '.join(tagged_cats)}")

            lines.append("")

    # Section 4: Compliance/Certificates
    compliance_has_content = compliance.get("certifications") or compliance.get("other")

    if compliance_has_content:
        lines += [
            "---",
            "",
            "## 4️⃣ Compliance & Certificates",
            "",
        ]

        if compliance.get("certifications"):
            lines.append("**Certifications:**")
            for cert in compliance["certifications"]:
                lines.append(f"- ✅ {cert}")
            lines.append("")

        if compliance.get("other"):
            lines.append("**Additional Info:**")
            for item in compliance["other"]:
                lines.append(f"- {item}")
            lines.append("")

    lines += [
        "---",
        "",
        "*This profile is auto-generated from your structured data. Edit via the Profile page.*"
    ]

    return "\n".join(lines)


def json_to_markdown_v3(profile_json: dict) -> str:
    """Convert new 4-section format to markdown."""
    basic_details = profile_json.get("basic_details", {})
    products = profile_json.get("products", [])
    infrastructure = profile_json.get("infrastructure", {})
    compliance = profile_json.get("compliance", {})

    company_name = basic_details.get("company_name", "My Business")

    lines = [
        f"# Business Profile",
        f"## {company_name}",
        "",
        "---",
        "",
        "## 1️⃣ Basic Details",
        "",
    ]

    # Basic company info
    if basic_details.get("company_name"):
        lines.append(f"**Company Name:** {basic_details['company_name']}")
        lines.append("")
    if basic_details.get("gst_number"):
        lines.append(f"**GST Number:** `{basic_details['gst_number']}`")
        lines.append("")

    # Contact info
    if basic_details.get("phone"):
        lines.append(f"**Phone:** {basic_details['phone']}")
        lines.append("")
    if basic_details.get("email"):
        lines.append(f"**Email:** {basic_details['email']}")
        lines.append("")
    if basic_details.get("website"):
        lines.append(f"**Website:** {basic_details['website']}")
        lines.append("")

    # Address
    address_parts = []
    if basic_details.get("address"):
        address_parts.append(basic_details["address"])
    if basic_details.get("city"):
        address_parts.append(basic_details["city"])
    if basic_details.get("state"):
        address_parts.append(basic_details["state"])
    if basic_details.get("pincode"):
        address_parts.append(basic_details["pincode"])

    if address_parts:
        lines.append("**Address:**")
        lines.append(f"> {', '.join(address_parts)}")
        lines.append("")

    # Other details
    if basic_details.get("other"):
        lines.append("**Additional Info:**")
        for item in basic_details["other"]:
            lines.append(f"- {item}")
        lines.append("")

    # Section 2: Products/Services
    if products:
        lines += [
            "---",
            "",
            "## 2️⃣ Products/Services",
            "",
        ]
        for idx, p in enumerate(products, 1):
            lines.append(f"### {idx}. {p.get('name', 'Product')}")
            lines.append("")

            if p.get("category"):
                lines.append(f"**Category:** {p['category']}")
                lines.append("")

            if p.get("description"):
                lines.append(f"**Description:** {p['description']}")
                lines.append("")

            if p.get("other"):
                lines.append(f"**Other:** {p['other']}")
                lines.append("")

            if idx < len(products):
                lines.append("")

    # Section 3: Infrastructure
    infra_has_content = any([
        infrastructure.get("factory_area_sqft"),
        infrastructure.get("number_of_machines"),
        infrastructure.get("production_capacity"),
        infrastructure.get("workforce_size"),
        infrastructure.get("storage_capacity"),
        infrastructure.get("other")
    ])

    if infra_has_content:
        lines += [
            "---",
            "",
            "## 3️⃣ Company Infrastructure",
            "",
        ]

        if infrastructure.get("factory_area_sqft"):
            lines.append(f"**Factory Area:** {infrastructure['factory_area_sqft']} sq ft")
            lines.append("")
        if infrastructure.get("number_of_machines"):
            lines.append(f"**Number of Machines:** {infrastructure['number_of_machines']}")
            lines.append("")
        if infrastructure.get("production_capacity"):
            lines.append(f"**Production Capacity:** {infrastructure['production_capacity']}")
            lines.append("")
        if infrastructure.get("workforce_size"):
            lines.append(f"**Workforce Size:** {infrastructure['workforce_size']}")
            lines.append("")
        if infrastructure.get("storage_capacity"):
            lines.append(f"**Storage Capacity:** {infrastructure['storage_capacity']}")
            lines.append("")

        if infrastructure.get("other"):
            lines.append("**Additional Info:**")
            for item in infrastructure["other"]:
                lines.append(f"- {item}")
            lines.append("")

    # Section 4: Compliance/Certificates
    compliance_has_content = compliance.get("certifications") or compliance.get("other")

    if compliance_has_content:
        lines += [
            "---",
            "",
            "## 4️⃣ Compliance & Certificates",
            "",
        ]

        if compliance.get("certifications"):
            lines.append("**Certifications:**")
            for cert in compliance["certifications"]:
                lines.append(f"- ✅ {cert}")
            lines.append("")

        if compliance.get("other"):
            lines.append("**Additional Info:**")
            for item in compliance["other"]:
                lines.append(f"- {item}")
            lines.append("")

    lines += [
        "---",
        "",
        "*This profile is auto-generated from your structured data. Edit via the Profile page.*"
    ]

    return "\n".join(lines)


def json_to_markdown_v2(profile_json: dict) -> str:
    """Legacy converter for old profile format (backward compatibility)."""
    if not profile_json:
        return ""

    company = profile_json.get("company", {})
    location = profile_json.get("location", {})
    about = profile_json.get("about", "")
    categories = profile_json.get("product_categories", [])
    products = profile_json.get("products", [])
    capabilities = profile_json.get("capabilities", {})
    serviceable_locations = profile_json.get("serviceable_locations", [])
    certifications = profile_json.get("certifications", [])
    payment_terms = profile_json.get("payment_terms", [])

    name = company.get("trade_name", "My Business")

    lines = [
        f"# Business Profile",
        f"## {name}",
        "",
        "---",
        "",
        "## 🏢 Company Details",
        "",
        f"**Trade Name:** {company.get('trade_name', '')}",
        "",
        f"**Legal Name:** {company.get('legal_name', '')}",
        "",
        f"**GSTIN:** `{company.get('gstin', '')}` ({company.get('gst_status', 'Active')})",
        "",
        f"**Business Type:** {company.get('business_type', '')}",
        "",
        f"**GST Registered:** {company.get('registration_date', '')}",
        "",
        "---",
        "",
        "## 📍 Location",
        "",
        f"**City, State:** {location.get('city', '')}, {location.get('state', '')}",
        "",
        f"**Address:**",
        f"> {location.get('address', '')}",
        "",
        f"**Nature of Business:** {', '.join(company.get('nature_of_business', []))}",
        "",
    ]

    if about:
        lines += ["---", "", "## 📖 About", "", about, ""]

    if categories:
        lines += ["---", "", "## 🏷️ Product Categories", ""]
        for c in categories:
            lines.append(f"- {c}")
        lines.append("")

    if certifications:
        lines += ["---", "", "## ✅ Certifications", ""]
        for c in certifications:
            lines.append(f"- {c}")
        lines.append("")

    if payment_terms:
        lines += ["---", "", "## 💳 Payment Terms", ""]
        for p in payment_terms:
            lines.append(f"- {p}")
        lines.append("")

    lines += ["---", "*This profile is auto-generated from your structured data. Edit via the Profile page.*"]

    return "\n".join(lines)


def gst_to_profile_json(gst_data: dict, url_profile: dict = None) -> dict:
    """
    Convert GST data to V4 profile format.

    Sections:
    1. Basic Details - Company name, GST, address
    2. Product Categories - Categories with products
    3. Infrastructure Items - Tagged with categories
    4. Compliance - Certifications
    """
    url_profile = url_profile or {}

    # Extract address data
    addr_data = gst_data.get("pradr", {}).get("addr", {})
    trade_name = url_profile.get("trade_name") or gst_data.get("tradeNam") or gst_data.get("lgnm", "")

    # Section 1: Basic Details (Auto-populated from GST)
    basic_details = {
        "company_name": trade_name,
        "gst_number": gst_data.get("gstin", ""),
        "address": gst_data.get("pradr", {}).get("adr", ""),
        "city": url_profile.get("city") or addr_data.get("loc", ""),
        "state": url_profile.get("state") or addr_data.get("stcd", ""),
        "pincode": addr_data.get("pncd", ""),
        "phone": "",
        "email": "",
        "website": "",
        "other": [
            f"Legal Name: {gst_data.get('lgnm', '')}",
            f"Business Type: {gst_data.get('ctb', '')}",
            f"GST Status: {gst_data.get('sts', 'Active')}",
            f"Registration Date: {gst_data.get('rgdt', '')}",
        ]
    }

    # Filter out empty other items
    basic_details["other"] = [item for item in basic_details["other"] if item.split(": ", 1)[1].strip()]

    # Section 2: Product Categories (Empty by default, user fills in)
    product_categories = []
    catalog = url_profile.get("product_catalog", []) or url_profile.get("products", [])

    # Group products by category if available
    category_map = {}
    for p in catalog:
        cat_name = p.get("category", "General")
        if cat_name not in category_map:
            category_map[cat_name] = []

        product = {
            "name": p.get("product_name") or p.get("name", ""),
            "gsm": p.get("gsm", ""),
            "fabric_type": p.get("fabric_type", ""),
            "color": p.get("color", ""),
            "size_range": p.get("size_range", ""),
            "moq": p.get("moq", ""),
            "description": p.get("description", ""),
            "other": ""
        }
        if product["name"]:
            category_map[cat_name].append(product)

    # Convert to category structure
    for cat_name, products in category_map.items():
        product_categories.append({
            "name": cat_name,
            "products": products
        })

    # Section 3: Infrastructure Items (Empty by default, user fills in)
    infrastructure_items = []

    # Section 4: Compliance (Empty by default, user fills in)
    compliance = {
        "certifications": url_profile.get("certifications", []),
        "other": []
    }

    return {
        "basic_details": basic_details,
        "product_categories": product_categories,
        "infrastructure_items": infrastructure_items,
        "compliance": compliance
    }
