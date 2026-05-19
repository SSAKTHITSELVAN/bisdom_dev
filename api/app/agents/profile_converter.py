"""
Profile JSON ↔ Markdown converter.

Maintains dual representation:
- profile_json: Source of truth for UI editing
- profile_md: Auto-generated cache for AI agents
"""


def json_to_markdown(profile_json: dict) -> str:
    """
    Convert structured profile JSON to markdown format for AI agents.
    This is the SAME formatting logic as build_profile_md but reads from JSON.
    """
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
        lines += [
            "---",
            "",
            "## 📖 About",
            "",
            about,
            "",
        ]

    if categories:
        lines += [
            "---",
            "",
            "## 🏷️ Product Categories",
            "",
        ]
        for c in categories:
            lines.append(f"- {c}")
        lines.append("")

    if products:
        lines += [
            "---",
            "",
            "## 📦 Products & Specifications",
            "",
        ]
        for idx, p in enumerate(products, 1):
            pname = p.get("name", "Product")
            specs = p.get("specifications", {})
            pricing = p.get("pricing", {})

            # Product header
            lines.append(f"### {idx}. {pname}")
            lines.append("")

            # Basic info
            category = p.get("category", "")
            target = p.get("target_gender", "")
            if category or target:
                lines.append("**Product Type:**")
                if category:
                    lines.append(f"  - Category: {category}")
                if target:
                    lines.append(f"  - Target: {target}")
                lines.append("")

            # Fabric & quality
            fabric = specs.get("fabric", {})
            gsm = specs.get("gsm", {})
            fit = specs.get("fit", "")
            if fabric or gsm or fit:
                lines.append("**Fabric & Quality:**")
                if fabric.get("type"):
                    fabric_line = f"  - Fabric: {fabric['type']}"
                    if fabric.get("composition"):
                        fabric_line += f" ({fabric['composition']})"
                    lines.append(fabric_line)
                if fabric.get("treatment"):
                    lines.append(f"  - Treatment: {fabric['treatment']}")
                if gsm.get("value"):
                    bucket = gsm.get("bucket", "")
                    lines.append(f"  - GSM: {gsm['value']}" + (f" [{bucket} quality]" if bucket and bucket != "unknown" else ""))
                if fit:
                    lines.append(f"  - Fit: {fit}")
                lines.append("")

            # Style details
            neck = specs.get("neck_type", "")
            sleeve = specs.get("sleeve_type", "")
            colors = specs.get("colors", [])
            sizes = specs.get("sizes", [])
            if neck or sleeve or colors or sizes:
                lines.append("**Style & Options:**")
                if neck:
                    lines.append(f"  - Neck: {neck}")
                if sleeve:
                    lines.append(f"  - Sleeve: {sleeve}")
                if colors:
                    lines.append(f"  - Colors: {', '.join(colors[:8])}")
                if sizes:
                    lines.append(f"  - Sizes: {', '.join(sizes)}")
                lines.append("")

            # Pricing
            price = pricing.get("price_per_unit")
            moq = pricing.get("moq")
            if price or moq:
                lines.append("**Pricing:**")
                if price:
                    currency = pricing.get("currency", "INR")
                    bucket = pricing.get("price_bucket", "")
                    lines.append(f"  - Price: {currency} {price}/piece" + (f" [{bucket}]" if bucket and bucket != "unknown" else ""))
                if moq:
                    lines.append(f"  - MOQ: {moq} pieces")
                lines.append("")

            # Customization
            printing = specs.get("printing_methods", [])
            use_cases = p.get("use_cases", [])
            if printing or use_cases:
                lines.append("**Customization & Usage:**")
                if printing:
                    lines.append(f"  - Printing: {', '.join(printing)}")
                if use_cases:
                    lines.append(f"  - Use Cases: {', '.join(use_cases)}")
                lines.append("")

            # Separator between products
            if idx < len(products):
                lines.append("---")
                lines.append("")

    if capabilities:
        active_caps = [k.replace("_", " ").title() for k, v in capabilities.items() if v]
        if active_caps:
            lines += [
                "---",
                "",
                "## ⚙️ Capabilities",
                "",
            ]
            for c in active_caps:
                lines.append(f"- {c}")
            lines.append("")

    if serviceable_locations:
        lines += [
            "---",
            "",
            "## 🌍 Serviceable Locations",
            "",
            ", ".join(serviceable_locations),
            "",
        ]

    if certifications:
        lines += [
            "---",
            "",
            "## ✅ Certifications",
            "",
        ]
        for c in certifications:
            lines.append(f"- {c}")
        lines.append("")

    if payment_terms:
        lines += [
            "---",
            "",
            "## 💳 Payment Terms",
            "",
        ]
        for p in payment_terms:
            lines.append(f"- {p}")
        lines.append("")

    lines += [
        "---",
        "*This profile is auto-generated from your structured data. Edit via the Profile page.*"
    ]

    return "\n".join(lines)


def gst_to_profile_json(gst_data: dict, url_profile: dict = None) -> dict:
    """
    Convert GST data + URL-extracted profile to initial profile JSON structure.
    This replaces the old build_profile_md for initial profile creation.
    """
    url_profile = url_profile or {}

    company = {
        "trade_name": url_profile.get("trade_name") or gst_data.get("tradeNam") or gst_data.get("lgnm", ""),
        "legal_name": gst_data.get("lgnm", ""),
        "gstin": gst_data.get("gstin", ""),
        "gst_status": gst_data.get("sts", "Active"),
        "business_type": gst_data.get("ctb", ""),
        "registration_date": gst_data.get("rgdt", ""),
        "nature_of_business": gst_data.get("nba", []),
    }

    addr_data = gst_data.get("pradr", {}).get("addr", {})
    location = {
        "city": url_profile.get("city") or addr_data.get("loc", ""),
        "state": url_profile.get("state") or addr_data.get("stcd", ""),
        "address": gst_data.get("pradr", {}).get("adr", ""),
        "pincode": addr_data.get("pncd", ""),
    }

    products = []
    catalog = url_profile.get("product_catalog", []) or url_profile.get("products", [])
    for p in catalog:
        specs_data = p.get("specifications", {})
        commercials = p.get("commercials", {})

        product = {
            "name": p.get("product_name") or p.get("name", ""),
            "category": p.get("category", ""),
            "target_gender": p.get("target_gender", ""),
            "url": p.get("product_url", ""),
            "description": p.get("description", ""),
            "specifications": {
                "fabric": specs_data.get("fabric", {}),
                "gsm": specs_data.get("gsm", {}),
                "fit": specs_data.get("fit", ""),
                "neck_type": specs_data.get("neck_type", ""),
                "sleeve_type": specs_data.get("sleeve_type", ""),
                "colors": specs_data.get("color", []),
                "sizes": p.get("sizes", {}).get("available", []),
                "printing_methods": p.get("printing_capabilities", {}).get("supported_methods", []),
            },
            "pricing": {
                "price_per_unit": commercials.get("price", {}).get("value"),
                "currency": commercials.get("price", {}).get("currency", "INR"),
                "price_bucket": commercials.get("price", {}).get("bucket", ""),
                "moq": commercials.get("moq", {}).get("value"),
            },
            "use_cases": p.get("use_cases", []),
        }
        products.append(product)

    return {
        "company": company,
        "location": location,
        "about": url_profile.get("business_summary", ""),
        "product_categories": url_profile.get("product_categories", []),
        "products": products,
        "capabilities": url_profile.get("capabilities", {}),
        "serviceable_locations": url_profile.get("serviceable_locations", []),
        "certifications": url_profile.get("certifications", []),
        "payment_terms": url_profile.get("payment_terms", []),
    }
