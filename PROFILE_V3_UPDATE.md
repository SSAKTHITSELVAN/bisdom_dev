# Profile Editor V3 - 4 Section Structure

**Date**: 2026-05-21  
**Author**: Claude + Sakthi

---

## 🎯 Overview

Restructured the profile editor from 2 sections to **4 clearly defined sections** as requested:

### New Structure

1. **Basic Details** - Company name, GST, address, contact info
2. **Products/Services** - List of products (T-Shirt, Polo, Hoodie, etc.)
3. **Company Infrastructure** - Square feet, machines, capacity, workforce
4. **Compliance/Certificates** - ISO, GOTS, and other certifications

---

## 📝 Key Features

### ✅ Auto-Population from GST

During **onboarding/GST verification**, the following fields are **automatically populated** in Section 1 (Basic Details):

- ✅ Company Name (from GST trade name)
- ✅ GST Number
- ✅ Address (from GST registered address)
- ✅ City
- ✅ State
- ✅ Pincode
- ✅ Other details (Legal name, Business type, GST status, Registration date)

### ✅ Flexible "Other" Fields

Each section includes an **"Other"** field where users can add **custom information**:

- **Basic Details**: Other → Array of additional info (e.g., "Established: 2015")
- **Products**: Other → String field per product (e.g., "Available in all sizes")
- **Infrastructure**: Other → Array (e.g., "Backup power: 100 KVA")
- **Compliance**: Other → Array (e.g., "Last audit: March 2024")

### ✅ Empty Sections Allowed

**All sections can be empty** - no mandatory fields except for the basics that GST provides:

- Basic Details → Auto-filled from GST (can be edited)
- Products → Starts empty, user adds manually
- Infrastructure → Starts empty, user adds manually
- Compliance → Starts empty, user adds manually

---

## 📂 Files Created/Modified

### Frontend

1. **Created**: `/ui/src/components/workspace/ProfileEditorV3.jsx`
   - New 4-section profile editor
   - Modal-based editing for each section
   - Import from JSON feature
   - Clean, card-based UI

2. **Modified**: `/ui/src/components/workspace/MainPanel.jsx`
   - Updated to use `ProfileEditorV3` instead of `ProfileEditorFixed`

### Backend

3. **Modified**: `/api/app/agents/profile_converter.py`
   - Updated `gst_to_profile_json()` to create 4-section structure
   - Updated `json_to_markdown()` to support new format (with backward compatibility)
   - Added `json_to_markdown_v3()` for new format
   - Added `json_to_markdown_v2()` for legacy format

4. **Modified**: `/api/app/api/v1/endpoints/config.py`
   - Updated `ConfigResponse` to include `profile` (JSON format)
   - Updated `UpdateConfigRequest` to accept `profile` (JSON)
   - Auto-generates markdown from JSON for AI agents

5. **No changes needed**: `/api/app/api/v1/endpoints/onboarding.py`
   - Already uses `gst_to_profile_json()` which now creates 4-section structure
   - GST data automatically populates Section 1 during onboarding

---

## 🔄 Data Flow

### Onboarding Flow

```
1. User enters GSTIN → GST API verification
2. gst_to_profile_json() creates 4-section profile
   ├─ basic_details: Auto-filled from GST ✅
   ├─ products: Empty []
   ├─ infrastructure: Empty {}
   └─ compliance: Empty {}
3. Profile saved to user_configs.profile_json
4. Markdown auto-generated for AI agents
```

### Profile Update Flow

```
1. User edits profile in UI
2. Frontend sends JSON to PUT /config/
3. Backend saves JSON to profile_json
4. Backend auto-generates markdown from JSON
5. AI agents read markdown (profile_md)
```

---

## 📊 JSON Structure

### Example: Complete 4-Section Profile

```json
{
  "basic_details": {
    "company_name": "Define Clothing Pvt Ltd",
    "gst_number": "33XXXXX1234X1ZX",
    "address": "123, Industrial Area, Muthanampalayam",
    "city": "Tiruppur",
    "state": "Tamil Nadu",
    "pincode": "641607",
    "phone": "+91 9876543210",
    "email": "contact@defineclothing.com",
    "website": "https://defineclothing.com",
    "other": [
      "Established: 2015",
      "Annual Turnover: ₹5-10 Cr"
    ]
  },
  "products": [
    {
      "name": "T-Shirt",
      "category": "Apparel",
      "description": "Premium cotton t-shirts",
      "other": "Available in all sizes"
    },
    {
      "name": "Polo Shirt",
      "category": "Apparel",
      "description": "Business casual polo shirts",
      "other": "Customization available"
    },
    {
      "name": "Hoodie",
      "category": "Apparel",
      "description": "Warm winter hoodies",
      "other": "Fleece lined"
    }
  ],
  "infrastructure": {
    "factory_area_sqft": "25000",
    "number_of_machines": "45",
    "production_capacity": "50000 pieces/month",
    "workforce_size": "120 employees",
    "storage_capacity": "10000 sq ft",
    "other": [
      "Backup power: 100 KVA",
      "Quality control lab: Yes"
    ]
  },
  "compliance": {
    "certifications": [
      "ISO 9001:2015",
      "GOTS Certified",
      "OEKO-TEX Standard 100",
      "SA8000"
    ],
    "other": [
      "Last audit: March 2024",
      "Valid until: March 2026"
    ]
  }
}
```

---

## 🔍 Backward Compatibility

The system maintains **backward compatibility**:

- Old profile format (with `company`, `location`, `products`) still works
- `json_to_markdown_v2()` handles legacy profiles
- New profiles use `json_to_markdown_v3()` for 4-section format
- Frontend gracefully initializes empty structure for new users

---

## ✨ UI Features

### Section 1: Basic Details
- ✅ Auto-filled from GST during onboarding
- ✅ Editable company name, GST, address, contact info
- ✅ "Other" field for custom details

### Section 2: Products/Services
- ✅ Add/Edit/Delete products
- ✅ Each product has: name, category, description, other
- ✅ Clean card-based display

### Section 3: Infrastructure
- ✅ Factory area, machines, capacity, workforce, storage
- ✅ "Other" field for custom infrastructure details

### Section 4: Compliance/Certificates
- ✅ Add multiple certifications (ISO, GOTS, etc.)
- ✅ "Other" field for audit dates, validity, etc.

### Import from JSON
- ✅ Modal with example JSON
- ✅ "Copy to Input" button
- ✅ Validation and error handling
- ✅ Replace entire profile or merge

---

## 🚀 How to Test

### Test 1: New User Onboarding
```bash
1. Register new user with phone + OTP
2. Enter GSTIN during onboarding
3. Navigate to Profile → Check Section 1 auto-filled ✅
4. Add products in Section 2 ✅
5. Add infrastructure in Section 3 ✅
6. Add certificates in Section 4 ✅
```

### Test 2: Import JSON
```bash
1. Go to Profile Editor
2. Click "Import from JSON"
3. Click "Show Example Format"
4. Click "Copy to Input"
5. Click "Import Profile"
6. Verify all 4 sections populated ✅
```

### Test 3: Edit Sections
```bash
1. Click "Edit" on each section
2. Modify fields
3. Save
4. Reload page → Changes persisted ✅
```

### Test 4: AI Agent Reading
```bash
1. Update profile in UI
2. Backend auto-generates markdown
3. AI agents read profile_md field
4. Verify agents see formatted profile ✅
```

---

## 🎯 Benefits

1. ✅ **Clear Structure** - 4 well-defined sections
2. ✅ **Auto-Population** - GST data fills Section 1 automatically
3. ✅ **Flexibility** - "Other" fields for custom data
4. ✅ **No Mandatory Fields** - All sections can be empty
5. ✅ **AI-Friendly** - Auto-generates markdown for AI agents
6. ✅ **Backward Compatible** - Old profiles still work
7. ✅ **User-Friendly** - Modal-based editing, clean UI
8. ✅ **Import/Export** - JSON import with examples

---

## 📋 Next Steps

### Immediate
- ✅ Test with real GST data
- ✅ Verify onboarding flow populates Section 1
- ✅ Test all CRUD operations (Add/Edit/Delete)

### Optional Enhancements
- 🔄 Add image upload for products
- 🔄 Add rich text editor for descriptions
- 🔄 Add validation rules (e.g., GST format, pincode)
- 🔄 Add export to PDF feature
- 🔄 Add profile completeness indicator

---

## 🐛 Known Issues

- None at this time

---

## 📝 Summary

Successfully restructured the profile editor to **4 clear sections** with:
- ✅ Auto-population from GST during onboarding
- ✅ Flexible "Other" fields in all sections
- ✅ All sections can be empty
- ✅ Clean UI with modal-based editing
- ✅ Import from JSON with examples
- ✅ Backward compatibility maintained
- ✅ AI agents read auto-generated markdown

**Status**: ✅ Ready for Testing
