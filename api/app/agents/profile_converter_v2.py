"""
Enhanced Profile JSON ↔ Markdown converter.
Supports detailed catalog format with supplier info.
"""


def json_to_markdown_v2(profile_json: dict) -> str:
    """
    Convert detailed profile JSON (with supplier + catalogue) to markdown.
    """
    if not profile_json:
        return ""

    supplier = profile_json.get("supplier", {})
    catalogue = profile_json.get("catalogue", [])

    # Also support old format for backward compatibility
    company = profile_json.get("company", {})
    if company and not supplier:
        # Use old converter for old format
        return json_to_markdown_old_format(profile_json)

    lines = []

    # Header
    name = supplier.get("name", "My Business")
    lines += [
        f"# Business Profile: {name}",
        "",
        "---",
        ""
    ]

    # Supplier Information
    if supplier:
        lines += [
            "## 🏢 Supplier Information",
            "",
            f"**Business Name:** {supplier.get('name', '')}",
            "",
            f"**Location:** {supplier.get('location', '')}",
            "",
            f"**Business Type:** {supplier.get('business_type', '')}",
            "",
            f"**Legal Status:** {supplier.get('legal_status', '')}",
            "",
        ]

        if supplier.get('since'):
            lines.append(f"**Established:** {supplier['since']}")
            lines.append("")

        if supplier.get('annual_turnover'):
            lines.append(f"**Annual Turnover:** {supplier['annual_turnover']}")
            lines.append("")

        if supplier.get('team_size'):
            lines.append(f"**Team Size:** {supplier['team_size']}")
            lines.append("")

        if supplier.get('gst_registration'):
            lines.append(f"**GST Registration:** {supplier['gst_registration']}")
            lines.append("")

        if supplier.get('hsn_codes'):
            lines.append(f"**HSN Codes:** {', '.join(supplier['hsn_codes'])}")
            lines.append("")

        lines += ["---", ""]

    # Product Catalog
    if catalogue:
        lines += [
            f"## 📦 Product Catalog ({len(catalogue)} items)",
            "",
        ]

        for idx, item in enumerate(catalogue, 1):
            product_name = item.get("product_name", "Unnamed Product")
            collection = item.get("collection", "")

            # Product header
            if collection:
                lines.append(f"### {idx}. {product_name} ({collection})")
            else:
                lines.append(f"### {idx}. {product_name}")
            lines.append("")

            # Product URL
            if item.get("product_url"):
                lines.append(f"🔗 **Product Link:** {item['product_url']}")
                lines.append("")

            # Pricing & MOQ
            price = item.get("price_per_piece")
            moq = item.get("moq")
            currency = item.get("currency", "INR")

            if price or moq:
                lines.append("**Pricing & MOQ:**")
                if price:
                    lines.append(f"  - Price: {currency} {price}/piece")
                if moq:
                    moq_unit = item.get("moq_unit", "Pieces")
                    lines.append(f"  - MOQ: {moq} {moq_unit}")
                lines.append("")

            # Fabric & Material
            fabric = item.get("fabric")
            fabric_composition = item.get("fabric_composition")
            gsm = item.get("gsm")
            fabric_treatment = item.get("fabric_treatment")

            if fabric or gsm or fabric_treatment:
                lines.append("**Fabric & Material:**")
                if fabric:
                    if fabric_composition:
                        lines.append(f"  - Fabric: {fabric} ({fabric_composition})")
                    else:
                        lines.append(f"  - Fabric: {fabric}")
                if gsm:
                    lines.append(f"  - GSM: {gsm}")
                if fabric_treatment:
                    lines.append(f"  - Treatment: {fabric_treatment}")
                lines.append("")

            # Style & Design
            fit_type = item.get("fit_type")
            neck_type = item.get("neck_type")
            sleeve_type = item.get("sleeve_type")
            pattern = item.get("pattern")
            color = item.get("color")

            if fit_type or neck_type or sleeve_type or pattern or color:
                lines.append("**Style & Design:**")
                if fit_type:
                    lines.append(f"  - Fit: {fit_type}")
                if neck_type:
                    lines.append(f"  - Neck: {neck_type}")
                if sleeve_type:
                    lines.append(f"  - Sleeve: {sleeve_type}")
                if pattern:
                    lines.append(f"  - Pattern: {pattern}")
                if color:
                    lines.append(f"  - Color: {color}")
                lines.append("")

            # Print Types
            print_type = item.get("print_type")
            if print_type:
                if isinstance(print_type, list):
                    lines.append(f"**Print Methods:** {', '.join(print_type)}")
                else:
                    lines.append(f"**Print Method:** {print_type}")
                lines.append("")

            # Sizes
            available_sizes = item.get("available_sizes")
            if available_sizes:
                lines.append(f"**Available Sizes:** {', '.join(available_sizes)}")
                lines.append("")

            # Use Cases
            use_case = item.get("use_case")
            if use_case:
                lines.append(f"**Use Cases:** {', '.join(use_case)}")
                lines.append("")

            # Additional Details
            wash_care = item.get("wash_care")
            country = item.get("country_of_origin")
            customization = item.get("customization_available")

            if wash_care or country or customization:
                lines.append("**Additional Details:**")
                if wash_care:
                    lines.append(f"  - Wash Care: {wash_care}")
                if country:
                    lines.append(f"  - Country of Origin: {country}")
                if customization:
                    lines.append(f"  - Customization: Available")
                lines.append("")

            # Warnings/Confirmations
            needs_confirmation = item.get("needs_confirmation")
            validation_note = item.get("validation_note")

            if needs_confirmation and validation_note:
                lines.append(f"⚠️ **Note:** {validation_note}")
                lines.append("")

            # Separator between products
            if idx < len(catalogue):
                lines.append("---")
                lines.append("")

    lines.append("---")
    lines.append("*This profile is auto-generated. Edit via the Profile page.*")

    return "\n".join(lines)


def json_to_markdown_old_format(profile_json: dict) -> str:
    """
    Backward compatibility: Convert old format (company/location/products) to markdown.
    """
    company = profile_json.get("company", {})
    location = profile_json.get("location", {})
    about = profile_json.get("about", "")
    products = profile_json.get("products", [])

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
        "---",
        "",
        "## 📍 Location",
        "",
        f"**City, State:** {location.get('city', '')}, {location.get('state', '')}",
        "",
        f"**Address:** {location.get('address', '')}",
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

    if products:
        lines += [
            "---",
            "",
            "## 📦 Products",
            "",
        ]
        for idx, p in enumerate(products, 1):
            lines.append(f"### {idx}. {p.get('name', 'Product')}")
            if p.get('category'):
                lines.append(f"Category: {p['category']}")
            lines.append("")

    lines.append("---")
    lines.append("*Auto-generated profile.*")

    return "\n".join(lines)


def convert_old_to_new_format(profile_json: dict) -> dict:
    """
    Convert old profile format to new detailed catalog format.
    """
    company = profile_json.get("company", {})
    location = profile_json.get("location", {})
    products = profile_json.get("products", [])

    # Map to new supplier structure
    supplier = {
        "name": company.get("trade_name") or company.get("legal_name", ""),
        "location": f"{location.get('city', '')}, {location.get('state', '')}",
        "business_type": company.get("business_type", ""),
        "legal_status": "",
        "since": None,
        "annual_turnover": "",
        "team_size": "",
        "gst_registration": company.get("registration_date", ""),
        "hsn_codes": []
    }

    # Map products to catalogue
    catalogue = []
    for p in products:
        specs = p.get("specifications", {})
        pricing = p.get("pricing", {})

        item = {
            "collection": p.get("category", ""),
            "product_name": p.get("name", ""),
            "product_url": p.get("url", ""),
            "price_per_piece": pricing.get("price_per_unit"),
            "currency": pricing.get("currency", "INR"),
            "moq": pricing.get("moq"),
            "moq_unit": "Pieces",
            "fabric": specs.get("fabric", {}).get("type", ""),
            "gsm": specs.get("gsm", {}).get("value"),
            "fit_type": specs.get("fit", ""),
            "neck_type": specs.get("neck_type", ""),
            "sleeve_type": specs.get("sleeve_type", ""),
            "pattern": None,
            "print_type": specs.get("printing_methods", []),
            "color": None,
            "available_sizes": specs.get("sizes", []),
            "use_case": p.get("use_cases", []),
            "wash_care": None,
            "fabric_treatment": specs.get("fabric", {}).get("treatment", ""),
            "country_of_origin": "India",
            "customization_available": False,
            "confidence_flag": "ok",
            "needs_confirmation": False
        }
        catalogue.append(item)

    return {
        "supplier": supplier,
        "catalogue": catalogue
    }
