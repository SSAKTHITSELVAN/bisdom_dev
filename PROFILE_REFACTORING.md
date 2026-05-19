# 📋 Profile Storage Refactoring

**Date**: 2026-05-19  
**Status**: ✅ DEPLOYED  
**Why**: User complained markdown formatting is hard to edit

---

## 🎯 **Problem**

**Before:**
- Profile stored as markdown text (`profile_md`)
- Users had to edit raw markdown
- Hard to add/edit products
- No structured data for UI forms

**User Feedback:**
> "The formatting looks the same (bad). Instead of md file, make it JSON which is better. Allow user to add products, then slightly update the JSON file. User work in UI, the file updates slightly."

---

## ✅ **Solution**

**Dual Storage Architecture:**
```
┌─────────────────────────────────────────┐
│  profile_json (Source of Truth)        │
│  - Structured JSON for UI editing      │
│  - Easy to add/edit/delete products    │
│  - Clean forms in frontend             │
└─────────────────────────────────────────┘
              ↓
    Auto-regenerate on change
              ↓
┌─────────────────────────────────────────┐
│  profile_md (Cache for AI Agents)      │
│  - Formatted markdown                   │
│  - Read by supplier/buyer agents       │
│  - No manual editing                    │
└─────────────────────────────────────────┘
```

**Key Principle:**
- **Users edit JSON** (via clean UI forms)
- **AI reads Markdown** (no code changes needed)
- **Markdown auto-regenerates** from JSON on every change

---

## 🗄️ **Database Schema**

### **Before:**
```sql
CREATE TABLE user_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    profile_md TEXT,  -- User edits this directly
    buyer_settings_md TEXT,
    seller_settings_md TEXT
);
```

### **After:**
```sql
CREATE TABLE user_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    profile_json JSONB DEFAULT '{}',  -- NEW: Source of truth
    profile_md TEXT,                  -- Auto-generated cache
    buyer_settings_md TEXT,
    seller_settings_md TEXT
);
```

**Migration:**
```bash
cd /home/ubuntu/bisdom_dev/api
python3 run_migration.py
```

---

## 📦 **JSON Structure**

```json
{
  "company": {
    "trade_name": "Example Textiles",
    "legal_name": "Example Textiles Pvt Ltd",
    "gstin": "29XXXXX1234X1ZX",
    "gst_status": "Active",
    "business_type": "Manufacturer",
    "registration_date": "2015-07-01",
    "nature_of_business": ["Manufacturer", "Exporter"]
  },
  "location": {
    "city": "Tirupur",
    "state": "Tamil Nadu",
    "address": "123 Industrial Area, Tirupur",
    "pincode": "641601"
  },
  "about": "Leading manufacturer of cotton t-shirts...",
  "product_categories": ["T-Shirts", "Polo Shirts", "Hoodies"],
  "products": [
    {
      "name": "Premium Cotton T-Shirt",
      "category": "T-Shirt",
      "target_gender": "Unisex",
      "url": "https://indiamart.com/...",
      "description": "High quality cotton t-shirt...",
      "specifications": {
        "fabric": {
          "type": "Cotton",
          "composition": "100% Cotton",
          "treatment": "Bio Washed"
        },
        "gsm": {
          "value": 180,
          "bucket": "standard"
        },
        "fit": "Regular",
        "neck_type": "Round Neck",
        "sleeve_type": "Half Sleeve",
        "colors": ["Black", "White", "Navy", "Grey"],
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "printing_methods": ["Screen Print", "DTF", "Embroidery"]
      },
      "pricing": {
        "price_per_unit": 150,
        "currency": "INR",
        "price_bucket": "mid",
        "moq": 100
      },
      "use_cases": ["Casual Wear", "Corporate Uniforms", "Sports Wear"]
    }
  ],
  "capabilities": {
    "manufacturing": true,
    "customization": true,
    "screen_print": true,
    "dtf": true,
    "embroidery": true
  },
  "serviceable_locations": ["Tamil Nadu", "Karnataka", "Kerala"],
  "certifications": ["ISO 9001", "GOTS"],
  "payment_terms": ["Net 30", "50% Advance"]
}
```

---

## 🔌 **New API Endpoints**

### **1. Get Profile**
```http
GET /api/v1/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "profile": { /* JSON structure above */ },
  "markdown": "# Business Profile\n## Example Textiles\n..."
}
```

---

### **2. Update Profile**
```http
POST /api/v1/profile/update
Content-Type: application/json
Authorization: Bearer <token>

{
  "company": {
    "trade_name": "Updated Name"
  },
  "about": "New description..."
}
```

**What happens:**
1. Update specified fields in `profile_json`
2. Auto-regenerate `profile_md` from JSON
3. Return both

---

### **3. Add Product**
```http
POST /api/v1/profile/products/add
Content-Type: application/json

{
  "product": {
    "name": "New Product",
    "category": "T-Shirt",
    "specifications": { /* ... */ },
    "pricing": { /* ... */ }
  }
}
```

**Result:** Product added to `products` array, markdown regenerated.

---

### **4. Update Product**
```http
POST /api/v1/profile/products/update

{
  "index": 0,
  "product": { /* updated product data */ }
}
```

---

### **5. Delete Product**
```http
POST /api/v1/profile/products/delete

{
  "index": 2
}
```

---

## 🤖 **Impact on AI Agents**

### **No Changes Needed!**

All AI agents still read `profile_md`:

```python
# Buyer agent (unchanged)
buyer_cfg = await get_or_create_config(user_id, db)
response = await buyer_agent_respond(
    profile_md=buyer_cfg.profile_md,  # ← Still reads markdown
    ...
)

# Supplier agent (unchanged)
supplier_cfg = await get_or_create_config(user_id, db)
response = await supplier_agent_respond(
    profile_md=supplier_cfg.profile_md,  # ← Still reads markdown
    ...
)
```

The markdown is **auto-generated** from JSON, so AI always sees up-to-date info.

---

## 🔄 **Data Flow**

### **On Onboarding:**
```
1. User provides GSTIN
2. GST data fetched
3. gst_to_profile_json(gst_data) → profile_json
4. json_to_markdown(profile_json) → profile_md
5. Both saved to database
```

### **On Profile Edit:**
```
1. User edits product in UI
2. POST /api/v1/profile/products/update
3. Update profile_json
4. json_to_markdown(profile_json) → regenerate profile_md
5. Save both
6. AI reads fresh markdown in next negotiation
```

### **During Negotiation:**
```
1. Supplier AI needs context
2. Read supplier_cfg.profile_md
3. Inject into system prompt
4. AI responds with full context
```

---

## 📂 **Files Changed**

### **New Files:**
1. `api/app/agents/profile_converter.py`
   - `json_to_markdown()`: JSON → beautiful markdown
   - `gst_to_profile_json()`: GST → structured JSON
   
2. `api/app/api/v1/endpoints/profile.py`
   - Profile CRUD endpoints
   - Product add/edit/delete
   - Auto-regenerates markdown

3. `api/migrations/add_profile_json.sql`
   - Database migration
   
4. `api/run_migration.py`
   - Migration runner script

### **Modified Files:**
1. `api/app/models/user_config.py`
   - Added `profile_json` column
   
2. `api/app/api/v1/endpoints/onboarding.py`
   - Use `gst_to_profile_json()` instead of `build_profile_md()`
   
3. `api/app/api/v1/router.py`
   - Register profile router

---

## 🧪 **Testing**

### **Test 1: Create Profile on Onboarding**
1. Sign up new user with GSTIN
2. Check database: both `profile_json` and `profile_md` populated
3. Verify markdown is formatted correctly

### **Test 2: Add Product**
```bash
curl -X POST http://3.109.70.144:8000/api/v1/profile/products/add \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "name": "Test T-Shirt",
      "category": "T-Shirt",
      "specifications": {
        "fabric": {"type": "Cotton"},
        "gsm": {"value": 180}
      },
      "pricing": {
        "price_per_unit": 150,
        "moq": 100
      }
    }
  }'
```

**Expected:**
- Product added to `profile_json.products`
- Markdown regenerated with new product
- Returns updated profile

### **Test 3: Edit Product**
```bash
curl -X POST http://3.109.70.144:8000/api/v1/profile/products/update \
  -H "Authorization: Bearer <token>" \
  -d '{"index": 0, "product": {"name": "Updated Name", ...}}'
```

### **Test 4: AI Negotiation Still Works**
1. Create requirement
2. Match to suppliers
3. Check supplier AI reads correct profile
4. Verify markdown includes latest products

---

## 🎨 **UI Implementation Guide**

### **Profile Page Components:**

**1. Company Info Section:**
```jsx
<CompanyInfo
  data={profile.company}
  onSave={(updated) => updateProfile({company: updated})}
/>
```

**2. Products List:**
```jsx
<ProductsList
  products={profile.products}
  onAdd={(product) => addProduct(product)}
  onEdit={(index, product) => updateProduct(index, product)}
  onDelete={(index) => deleteProduct(index)}
/>
```

**3. Product Form:**
```jsx
<ProductForm
  initialData={product}
  onSubmit={(data) => {
    if (isEdit) updateProduct(index, data)
    else addProduct(data)
  }}
/>
```

### **Sample API Calls:**
```javascript
// Get profile
const response = await fetch('/api/v1/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const { profile, markdown } = await response.json()

// Add product
await fetch('/api/v1/profile/products/add', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ product: newProduct })
})

// Update profile section
await fetch('/api/v1/profile/update', {
  method: 'POST',
  body: JSON.stringify({
    about: "Updated description...",
    certifications: ["ISO 9001", "GOTS"]
  })
})
```

---

## ✅ **Benefits**

### **For Users:**
- ✅ Clean UI forms instead of raw markdown editing
- ✅ Easy add/edit/delete products
- ✅ Structured fields with validation
- ✅ Visual feedback on changes

### **For Developers:**
- ✅ Backward compatible (AI code unchanged)
- ✅ Structured data easy to query/filter
- ✅ Single source of truth (JSON)
- ✅ No manual markdown formatting

### **For AI Agents:**
- ✅ No code changes needed
- ✅ Always read fresh markdown
- ✅ Beautiful formatting maintained
- ✅ Context injection unchanged

---

## 🚀 **Deployment Checklist**

- [x] Add `profile_json` column to database
- [x] Create `profile_converter.py` module
- [x] Create profile API endpoints
- [x] Update onboarding to use JSON
- [x] Run migration script
- [x] Restart API service
- [ ] Build profile editing UI
- [ ] Add product form component
- [ ] Test end-to-end flow
- [ ] Document UI usage for users

---

## 📝 **Migration Path for Existing Users**

**Existing users with `profile_md` only:**

Option 1: **Auto-migrate on first edit**
```python
if not config.profile_json:
    # Parse markdown → JSON (basic extraction)
    # Or ask user to re-enter via UI
    config.profile_json = extract_from_markdown(config.profile_md)
```

Option 2: **Keep markdown as fallback**
```python
profile_md = config.profile_md
if config.profile_json:
    # Regenerate from JSON
    profile_md = json_to_markdown(config.profile_json)
```

**Recommendation:** Use Option 2 (graceful fallback).

---

## 🔮 **Future Enhancements**

1. **Bulk Import:**
   - CSV → JSON products
   - IndiaMART catalog sync

2. **Product Templates:**
   - Quick add common products
   - Pre-filled specifications

3. **Version History:**
   - Track profile changes
   - Restore previous versions

4. **AI-Powered Fields:**
   - Auto-suggest use cases
   - Generate product descriptions

5. **Rich Media:**
   - Product images in JSON
   - Display in negotiation UI

---

**Status:** ✅ Backend Complete | 🔨 UI In Progress  
**Backward Compatible:** Yes  
**Breaking Changes:** None  
**AI Agent Impact:** Zero (still reads markdown)
