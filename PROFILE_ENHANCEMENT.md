# Profile Panel Enhancement Documentation

## Overview
Enhanced the Business Profile panel to intelligently parse and display markdown content in a human-friendly format while preserving the raw markdown in storage.

## Implementation Details

### Storage Format (Unchanged)
- Profile data continues to be stored as raw markdown in `user_configs.profile_md`
- AI agents read the markdown verbatim as company context
- No changes to database schema or API

### Display Format (New)
- Markdown is parsed and categorized into sections
- Key-value pairs are extracted and displayed in cards
- Products are organized with detailed specifications
- Visual icons enhance section identification

## UI Components

### Section Types

#### 1. Supplier Overview
```
Icon: Building2 (blue)
Purpose: Display company information
Fields: Supplier name, location, business type, team size, etc.
Layout: Vertical list of key-value pairs
```

#### 2. Contact Information
```
Icon: MapPin (blue)
Purpose: Display contact details
Fields: Email, phone, website, address
Layout: Vertical list of key-value pairs
```

#### 3. Capabilities & Certifications
```
Icon: Award (blue)
Purpose: Display company capabilities
Fields: Production capacity, certifications, methods, treatments
Layout: Vertical list of key-value pairs
```

#### 4. Product Catalogue
```
Icon: Package (blue)
Purpose: Display product listings
Structure: Product cards with specifications
Layout: Vertical stack of product cards
  - Each card: Product name + grid of specifications
  - Grid: Auto-fit columns, min 200px width
```

#### 5. Additional Information
```
Icon: Info (blue)
Purpose: Catch-all for other details
Fields: Payment terms, delivery time, policies
Layout: Vertical list of key-value pairs
```

## Parser Logic

### Section Detection
```javascript
Header Level → Action
# (H1)       → Set document title
## (H2)      → Switch section context based on keywords
### (H3)     → Create product entry (in catalog section)
#### (H4)    → Create product entry (in catalog section)
```

### Keyword Mapping
```javascript
H2 Header Contains     → Section
"overview", "supplier" → overview
"catalogue", "catalog" → catalog
"contact", "location"  → contact
"capabilities", "cert" → capabilities
Other                  → misc
```

### Data Extraction
```javascript
Format: "- Key: Value"
Action: Extract key and value, store in current section/product

Current Context + Line Format → Storage Location
catalog + ### header           → New product in catalog[]
catalog + - Key: Value         → Current product.details{}
overview + - Key: Value        → overview{}
contact + - Key: Value         → contact{}
capabilities + - Key: Value    → capabilities{}
misc + - Key: Value            → misc[]
```

## Visual Design

### Color Palette
```
Primary Blue:   #60a5fa
Border:         rgba(255,255,255,0.08)
Background:     rgba(255,255,255,0.03)
Text Primary:   #fff
Text Secondary: rgba(255,255,255,0.85)
Text Tertiary:  rgba(255,255,255,0.4)
Icon Container: rgba(59,130,246,0.15)
Icon Border:    rgba(59,130,246,0.3)
```

### Spacing
```
Section margin:  16px bottom
Section padding: 20px
Card padding:    16px
Grid gap:        12px
Key-value gap:   10px
Icon size:       14-16px
Icon container:  32-36px
```

### Typography
```
Document title:   20px, weight 800
Section title:    14px, weight 700
Product name:     13px, weight 700, color #60a5fa
Key label:        10-11px, weight 600, opacity 0.4
Value text:       12-13px, weight normal, opacity 0.75-0.85
```

## Example Transformation

### Input (Markdown)
```markdown
## Supplier Overview
- Supplier: Define Clothing
- Location: Tiruppur, Tamil Nadu
- Team size: 26 to 50 people

## Product Catalogue

#### Men Plain T Shirt
- Price: ₹165 / Piece
- MOQ: 50 Pcs
- Fabric: Cotton
- GSM: 240 GSM
```

### Output (Rendered UI)
```
┌─────────────────────────────────────┐
│ 🏢 Supplier Overview               │
├─────────────────────────────────────┤
│ Supplier                            │
│ Define Clothing                     │
│                                     │
│ Location                            │
│ Tiruppur, Tamil Nadu                │
│                                     │
│ Team size                           │
│ 26 to 50 people                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📦 Product Catalogue                │
│ 1 product listed                    │
├─────────────────────────────────────┤
│ Men Plain T Shirt                   │
│ ┌────────────┬─────────────────┐   │
│ │ Price      │ MOQ             │   │
│ │ ₹165/Piece │ 50 Pcs          │   │
│ ├────────────┼─────────────────┤   │
│ │ Fabric     │ GSM             │   │
│ │ Cotton     │ 240 GSM         │   │
│ └────────────┴─────────────────┘   │
└─────────────────────────────────────┘
```

## Edge Cases Handled

1. **Empty Profile**: Shows "No profile yet" with "Write Profile" button
2. **Missing Sections**: Sections with no data are not displayed
3. **No Catalog**: Catalog section only renders if products exist
4. **Malformed Markdown**: Parser gracefully handles missing colons or irregular formats
5. **Mixed Content**: Misc section catches any unclassified content

## Edit Mode

### Features
- Toggle between view/edit with button in header
- Edit mode: Full-width textarea with monospace font
- Raw markdown is editable
- Save button commits changes to database
- Cancel button discards draft changes
- Helper text explains AI agent usage

### UX Flow
```
View Mode → Click "Edit" → Edit Mode
           ↓                 ↓
      Display parsed    Show textarea
      sections         with raw markdown
           ↑                 ↓
      Click "Cancel"   Click "Save"
      or auto-update   → Update storage
         after save    → Switch to view
                       → Re-parse & render
```

## Performance Considerations

1. **Parsing**: Lightweight, single-pass algorithm O(n)
2. **Re-render**: Only on save, not on every edit keystroke
3. **Memoization**: Not needed due to infrequent updates
4. **Large Catalogs**: Grid layout prevents layout shifts

## Accessibility

- Semantic HTML structure
- Clear visual hierarchy
- Readable font sizes (min 10px)
- High contrast ratios
- Icon labels for screen readers
- Keyboard navigation support

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid support required
- Flexbox support required
- No polyfills needed

## Testing Recommendations

### Unit Tests
- [ ] parseProfile() with valid markdown
- [ ] parseProfile() with empty string
- [ ] parseProfile() with malformed markdown
- [ ] Section detection accuracy
- [ ] Key-value extraction accuracy

### Integration Tests
- [ ] Load profile from API
- [ ] Edit and save profile
- [ ] Cancel edit without saving
- [ ] Toggle between view/edit modes
- [ ] Handle API errors gracefully

### Visual Tests
- [ ] Section rendering
- [ ] Product card layout
- [ ] Grid responsiveness
- [ ] Icon alignment
- [ ] Color consistency
- [ ] Typography consistency

### User Tests
- [ ] Profile readability
- [ ] Easy to understand sections
- [ ] Clear product specifications
- [ ] Intuitive edit flow
- [ ] Satisfactory save feedback

## Future Enhancements

### Short-term
1. Add search functionality within catalog
2. Add collapsible sections for large catalogs
3. Add export to PDF/CSV options
4. Add inline editing in view mode

### Long-term
1. Visual editor (WYSIWYG) for non-technical users
2. Drag-and-drop product reordering
3. Bulk product import from CSV/Excel
4. Product image upload and gallery
5. Version history and rollback
6. Profile templates for common industries
7. AI-assisted profile writing
8. Auto-categorization of products
9. Duplicate detection and merging
10. Integration with external catalogs (IndiaMART, etc.)

## Maintenance Notes

### Code Location
- File: `ui/src/components/workspace/ProfilePanel.jsx`
- Function: `parseProfile(text)`
- Render: `renderParsedProfile()`

### Dependencies
- React hooks: useState, useEffect
- Icons: lucide-react
- API: @/api/config (getConfig, updateConfig)
- Toast: react-hot-toast

### Breaking Changes (None)
- Fully backward compatible
- No API changes
- No database schema changes
- No migration required

### Configuration
No configuration needed. Works out-of-the-box.

### Troubleshooting

**Issue**: Sections not displaying
- Check if markdown has proper header format (## Header)
- Verify key-value format (- Key: Value)

**Issue**: Products not categorized
- Ensure product headers use ### or ####
- Check if parent section header contains "catalog" keyword

**Issue**: Edit not saving
- Check API connection
- Verify user permissions
- Check console for errors

**Issue**: Styling broken
- Verify Tailwind CSS is loaded
- Check global styles in index.css
- Inspect element for conflicting styles
