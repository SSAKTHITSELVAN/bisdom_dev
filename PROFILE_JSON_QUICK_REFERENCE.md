# Profile JSON Quick Reference

## ✅ Deployment Status
- **Deployed:** May 21, 2026 14:31 UTC
- **Status:** Live & Running
- **URL:** http://3.109.70.144:5173
- **API:** http://3.109.70.144:8000 (healthy)

## 📋 How to Use JSON Import

### Step 1: Access Profile Editor
1. Go to http://3.109.70.144:5173
2. Login as a supplier account
3. Navigate to **Workspace** → **Profile** tab
4. Click **"Import JSON"** button

### Step 2: Use the Template
1. Click **"Copy to Input"** to load the example
2. Modify the example with your data
3. Click **"Import"** to save

## 🎯 Key Schema Points

### Infrastructure Format (IMPORTANT!)

❌ **DON'T use old format:**
```json
{
  "name": "Factory",
  "details": { "capacity": "50000" },
  "tagged_categories": ["Apparel"]
}
```

✅ **DO use new format:**
```json
{
  "name": "Factory A - Main Production",
  "area": "25000",
  "machines": "45",
  "workforce": "120",
  "category_capacities": [
    { "category": "Apparel", "capacity": "50000 pcs/month" },
    { "category": "Home Textiles", "capacity": "30000 pcs/month" }
  ]
}
```

### Category Capacities - Key Features
✅ One infrastructure can produce **multiple categories**  
✅ Each category gets **its own capacity**  
✅ Category name **must match** product category name  
✅ Capacity is free-form text (e.g., "50000 pcs/month", "Storage only")

## 🧪 Validation Tool

```bash
# Validate your JSON before importing
python3 validate_profile_schema.py your_profile.json

# Example output:
# ✅ Schema validation passed!
# 📊 Summary:
#    - Categories: 3
#    - Total Products: 4
#    - Infrastructure: 3
#    - Certifications: 3
```

## 📝 Minimal Valid Example

```json
{
  "basic_details": {
    "company_name": "My Company",
    "gst_number": "33AAAAA0000A1Z5",
    "city": "Tiruppur",
    "state": "Tamil Nadu"
  },
  "product_categories": [],
  "infrastructure_items": [],
  "compliance": {
    "certifications": [],
    "other": []
  }
}
```

## 🎨 Full Example (Copy This!)

```json
{
  "basic_details": {
    "company_name": "Define Clothing Pvt Ltd",
    "gst_number": "33XXXXX1234X1ZX",
    "address": "123, Industrial Area, Phase 2",
    "city": "Tiruppur",
    "state": "Tamil Nadu",
    "pincode": "641607",
    "phone": "+91 9876543210",
    "email": "contact@defineclothing.com",
    "website": "https://defineclothing.com",
    "other": ["Established: 2015", "Export License: EXP12345"]
  },
  "product_categories": [
    {
      "name": "Apparel",
      "products": [
        {
          "name": "T-Shirt",
          "gsm": "180 GSM",
          "fabric_type": "Cotton",
          "color": "All colors available",
          "size_range": "S to XXL",
          "moq": "500 pieces",
          "description": "Premium quality cotton t-shirts",
          "other": "Customization available"
        }
      ]
    }
  ],
  "infrastructure_items": [
    {
      "name": "Factory A - Main Production Unit",
      "area": "25000",
      "machines": "45",
      "workforce": "120",
      "category_capacities": [
        { "category": "Apparel", "capacity": "50000 pcs/month" }
      ]
    }
  ],
  "compliance": {
    "certifications": ["ISO 9001:2015", "GOTS Certified"],
    "other": ["Last audit: March 2024"]
  }
}
```

## 🔧 Troubleshooting

### Import Fails with "Invalid JSON"
- Check for missing commas
- Check for trailing commas (not allowed)
- Check all quotes are double quotes (not single)
- Use validation tool: `python3 validate_profile_schema.py file.json`

### Category Capacities Not Showing
- Ensure category names in `category_capacities` **exactly match** category names in `product_categories`
- Case-sensitive: "Apparel" ≠ "apparel"

### Old Data Still Showing
- The system supports old format for backward compatibility
- Edit and save to migrate to new format
- Or re-import with correct new format

## 📞 Support

### Testing URLs
- **Frontend:** http://3.109.70.144:5173
- **API Docs:** http://3.109.70.144:8000/docs
- **API Health:** http://3.109.70.144:8000/health

### Validation
```bash
# Test files included
./test_profile_import.json - Working example
./validate_profile_schema.py - Validation script
```

### Documentation
- Full details: `PROFILE_JSON_SCHEMA_UPDATE.md`
- Main component: `ui/src/components/workspace/ProfileEditorV4.jsx` (lines 800-871)

---

**Last Updated:** May 21, 2026  
**Version:** V4  
**Status:** ✅ Production Ready
