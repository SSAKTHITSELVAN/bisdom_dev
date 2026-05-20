# Profile UI: JSON-Based Editing Implementation

**Date**: 2026-05-20  
**Status**: ✅ READY FOR TESTING  
**Why**: User requested JSON-based profile editing instead of raw markdown

---

## 🎯 **What Changed**

### **Before:**
- Users edited raw markdown text in a textarea
- Difficult to add/edit structured data like products
- Poor UX for form-based data entry

### **After:**
- Clean, structured UI with dedicated forms
- Easy-to-use product management (add/edit/delete)
- JSON stored in backend, markdown auto-generated for AI
- Modern card-based layout with inline editing

---

## 📦 **New Files Created**

### 1. **`ui/src/api/profile.js`**
New API client for profile operations:
```javascript
- getProfile()           // Fetch profile JSON + markdown
- updateProfile(data)    // Update any profile section
- addProduct(product)    // Add new product
- updateProduct(index, product)  // Update existing product
- deleteProduct(index)   // Delete product
```

### 2. **`ui/src/components/workspace/ProfilePanelNew.jsx`**
Complete rewrite of ProfilePanel with:
- **Inline editing**: Click "Edit" on any section to modify
- **Product management**: Add/edit/delete products with form
- **Tag inputs**: Easy color/size entry with visual feedback
- **Modern UI**: Card-based layout with icons and badges
- **Real-time updates**: Changes save immediately to backend

---

## 🎨 **UI Features**

### **Section Editors:**

1. **Company Information**
   - Trade Name, Legal Name, Business Type
   - Inline edit mode with save/cancel

2. **Location & Address**
   - City, State, Address, Pincode
   - Structured input fields

3. **About Business**
   - Textarea for business description
   - Rich text support planned

4. **Products Catalog**
   - List view with edit/delete actions
   - Add new product button
   - Product form with:
     - Basic info (name, category, description)
     - Specifications (fabric, GSM, colors, sizes)
     - Pricing (price per unit, MOQ)
     - Tag inputs for arrays (colors, sizes)

### **User Experience:**

- **Hero card** shows company name with gradient background
- **Two-column layout** for desktop (company/location split)
- **Inline editing** - no navigation away from page
- **Visual feedback** - spinners during save, toasts on success/error
- **Empty states** - helpful prompts when no data exists

---

## 🔄 **Data Flow**

### **On Page Load:**
```
1. GET /api/v1/profile
2. Receive { profile: {...}, markdown: "..." }
3. Display profile in structured cards
```

### **On Section Edit:**
```
1. User clicks "Edit" on Company section
2. Form appears with current data
3. User modifies fields
4. Click "Save"
5. POST /api/v1/profile/update { company: {...} }
6. Backend updates profile_json
7. Backend auto-regenerates profile_md
8. Response returns updated profile
9. UI updates, exit edit mode
```

### **On Product Add:**
```
1. User clicks "Add Product"
2. Product form appears
3. User fills: name, category, specs, pricing
4. Uses tag inputs for colors/sizes
5. Click "Add Product"
6. POST /api/v1/profile/products/add { product: {...} }
7. Product appended to profile_json.products[]
8. Markdown regenerated
9. UI shows new product in list
```

---

## 📊 **Backend (Already Implemented)**

The backend was already refactored in previous session:

- **Model**: `UserConfig.profile_json` (JSONB column)
- **Cache**: `UserConfig.profile_md` (auto-generated)
- **Converter**: `json_to_markdown()` maintains formatting
- **Endpoints**: Full CRUD for profile + products

**No backend changes needed!**

---

## ✅ **Testing Checklist**

### **Deployment:**
- [ ] Deploy UI changes to EC2
- [ ] Verify `/api/v1/profile` endpoints are accessible
- [ ] Test with existing user account

### **Functional Testing:**

**Company Section:**
- [ ] Click "Edit" on Company Information
- [ ] Modify trade name, legal name, business type
- [ ] Save changes
- [ ] Verify data persists after page refresh

**Location Section:**
- [ ] Edit city, state, address, pincode
- [ ] Save and verify

**About Section:**
- [ ] Edit business description
- [ ] Check markdown rendering (if any formatting)

**Products:**
- [ ] Add first product with all fields
- [ ] Add colors using tag input (type + Enter)
- [ ] Add sizes using tag input
- [ ] Save product
- [ ] Edit existing product
- [ ] Delete product with confirmation

**AI Integration:**
- [ ] Create a new requirement as buyer
- [ ] Check if AI reads updated profile (check logs)
- [ ] Verify markdown includes new products

---

## 🐛 **Known Issues / TODO**

### **Current Limitations:**
1. No rich text editor for "About" section (plain textarea)
2. No image upload for products
3. No bulk product import (CSV)
4. No product templates
5. No validation on GSTIN format
6. No undo/redo functionality

### **Future Enhancements:**
1. **Rich text editor** for About section (TinyMCE/Quill)
2. **Product images** - upload and display
3. **Drag-and-drop** reordering for products
4. **Import/Export** - CSV or JSON bulk operations
5. **Product templates** - quick add common products
6. **Version history** - track changes over time
7. **AI suggestions** - auto-fill product descriptions
8. **Duplicate product** - clone and edit
9. **Categories management** - predefined categories
10. **Capabilities section** - edit manufacturing capabilities

---

## 📝 **Migration Notes**

### **For Existing Users:**

Users with only `profile_md` (old format):
- Will see parsed data in new UI (best-effort extraction)
- Should re-enter data in structured form for best results
- Backend gracefully handles missing `profile_json`

**Recommendation**: 
- Send email to existing users about new profile editor
- Guide them to re-enter critical product data
- Offer migration assistance if needed

---

## 🚀 **Deployment Commands**

```bash
# On development machine
cd ~/bisdom

# Commit UI changes
git add ui/src/api/profile.js
git add ui/src/components/workspace/ProfilePanelNew.jsx
git add ui/src/App.jsx
git add PROFILE_UI_JSON.md
git commit -m "Add JSON-based profile editor with structured forms"

# Deploy to EC2
./deploy.sh "Add JSON-based profile editor UI"
```

**OR** manually:

```bash
# Push to GitHub
git push origin main

# SSH to EC2
ssh -i ~/Downloads/bisdom_server.pem ubuntu@3.109.70.144

# Pull and restart
cd bisdom_dev
git pull origin main
cd ui && npm install  # If any new dependencies
sudo systemctl restart bisdom-ui.service

# Verify
curl http://3.109.70.144:8000/api/v1/profile
```

---

## 🔍 **Verification Steps**

### **1. Check API Health:**
```bash
# Get profile (should return JSON structure)
curl -X GET http://3.109.70.144:8000/api/v1/profile \
  -H "Authorization: Bearer <token>"
```

### **2. Test Product Add:**
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
        "gsm": {"value": 180},
        "colors": ["Black", "White"],
        "sizes": ["S", "M", "L"]
      },
      "pricing": {
        "price_per_unit": 150,
        "moq": 100,
        "currency": "INR"
      }
    }
  }'
```

### **3. Check Markdown Generation:**
```bash
# After adding product, check that markdown includes it
curl -X GET http://3.109.70.144:8000/api/v1/profile \
  -H "Authorization: Bearer <token>" \
  | jq '.markdown'
```

---

## 📚 **Documentation Updates**

### **Files to Update:**
1. `README.md` - Mention new profile editor
2. `ai_context/PROJECT_STATUS.md` - Mark profile UI as complete
3. `ai_context/TASKS.md` - Close related tasks

### **New User Guide:**
Consider creating `PROFILE_USER_GUIDE.md` with:
- How to edit company information
- How to add products
- How to use tag inputs
- What AI agents see in negotiations

---

## 🎓 **Key Technical Details**

### **Component Architecture:**
```
ProfilePanelNew (Container)
├── Company Hero Card (Display + Edit)
├── InfoCard Components (Reusable)
│   ├── CompanyEditor (Form)
│   ├── LocationEditor (Form)
│   └── AboutEditor (Form)
└── Products Section
    ├── Product List (Display)
    └── ProductForm (Add/Edit)
        ├── InputField (Reusable)
        ├── TextAreaField (Reusable)
        └── TagInput (Custom component)
```

### **State Management:**
```javascript
profile        // Full profile JSON from API
loading        // Initial load state
saving         // Save in progress
editMode       // Which section is being edited
editData       // Temporary form data during edit
showProductForm // Product form visibility
```

### **Edit Modes:**
- `null` - View mode (no editing)
- `'company'` - Editing company section
- `'location'` - Editing location section
- `'about'` - Editing about section
- `'product-0'` - Editing product at index 0
- `'product-1'` - Editing product at index 1
- etc.

---

## 🔗 **Related Documentation**

- Backend implementation: `PROFILE_REFACTORING.md`
- API endpoints: `api/app/api/v1/endpoints/profile.py`
- Data converter: `api/app/agents/profile_converter.py`
- Old UI (reference): `ui/src/components/workspace/ProfilePanel.jsx`

---

**Status**: ✅ Implementation Complete | 🧪 Ready for Testing  
**Next Steps**: Deploy to EC2, test with real user, gather feedback  
**Breaking Changes**: None (backward compatible with old markdown)  
**Impact**: ⭐⭐⭐ High (major UX improvement)
