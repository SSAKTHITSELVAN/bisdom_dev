"""
Profile JSON ↔ Markdown converter.

Maintains dual representation:
- profile_json: Source of truth for UI editing
- profile_md: Auto-generated cache for AI agents
"""


def json_to_markdown(profile_json: dict) -> str:
    """
    Convert new 4-section profile JSON to markdown format for AI agents.

    Sections:
    1. Basic Details
    2. Products/Services
    3. Infrastructure
    4. Compliance/Certificates
    """
    if not profile_json:
        return ""

    # Check if it's the new format (4 sections)
    if "basic_details" in profile_json:
        return json_to_markdown_v3(profile_json)

    # Fall back to old format converter for backward compatibility
    return json_to_markdown_v2(profile_json)


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
    Convert GST data to new 4-section profile format.

    Sections:
    1. Basic Details - Company name, GST, address
    2. Products/Services - List of products
    3. Infrastructure - Factory details
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

    # Section 2: Products (Empty by default, user fills in)
    products = []
    catalog = url_profile.get("product_catalog", []) or url_profile.get("products", [])
    for p in catalog:
        product = {
            "name": p.get("product_name") or p.get("name", ""),
            "category": p.get("category", ""),
            "description": p.get("description", ""),
            "other": ""
        }
        if product["name"]:
            products.append(product)

    # Section 3: Infrastructure (Empty by default, user fills in)
    infrastructure = {
        "factory_area_sqft": "",
        "number_of_machines": "",
        "production_capacity": "",
        "workforce_size": "",
        "storage_capacity": "",
        "other": []
    }

    # Section 4: Compliance (Empty by default, user fills in)
    compliance = {
        "certifications": url_profile.get("certifications", []),
        "other": []
    }

    return {
        "basic_details": basic_details,
        "products": products,
        "infrastructure": infrastructure,
        "compliance": compliance
    }
