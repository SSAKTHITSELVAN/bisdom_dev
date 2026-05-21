import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Save, Edit3, Building2, Package, MapPin, Plus, Trash2, X, Check,
  Factory, Award, Upload, FileText, RefreshCw, Tag
} from 'lucide-react'

/**
 * Profile Structure V4 - 4 Sections with Enhanced Product/Infra
 *
 * 1. Basic Details - Company name, GST, address
 * 2. Products/Services - Categories with products under each
 * 3. Company Infrastructure - Multiple infra items, each tagged with categories
 * 4. Compliance/Certificates - ISO, GOTS, etc.
 *
 * Changes from V3:
 * - No auto-reload after save (manual refresh button)
 * - Products: Category-first structure
 * - Infrastructure: Array of items, each with category tags
 */

export default function ProfileEditorV4() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [jsonInput, setJsonInput] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await getConfig()
      let profileData = res.data.profile || {}

      // Initialize empty structure if needed
      if (!profileData.basic_details && !profileData.product_categories && !profileData.infrastructure_items && !profileData.compliance) {
        profileData = {
          basic_details: {
            company_name: '',
            gst_number: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            phone: '',
            email: '',
            website: '',
            other: []
          },
          product_categories: [],
          infrastructure_items: [],
          compliance: {
            certifications: [],
            other: []
          }
        }
      }

      setProfile(profileData)
    } catch (error) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh
  const handleRefresh = () => {
    loadProfile()
    toast.success('Profile refreshed')
  }

  // Section 1: Basic Details
  const handleUpdateBasicDetails = async (data) => {
    setSaving(true)
    try {
      const updatedProfile = { ...profile, basic_details: data }
      await updateConfig({ profile: updatedProfile })
      setProfile(updatedProfile)
      setEditingSection(null)
      toast.success('Basic details updated')
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // Section 2: Product Categories
  const handleSaveProductCategories = async (categories) => {
    setSaving(true)
    try {
      const updatedProfile = { ...profile, product_categories: categories }
      await updateConfig({ profile: updatedProfile })
      setProfile(updatedProfile)
      setEditingSection(null)
      toast.success('Product categories updated')
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // Section 3: Infrastructure
  const handleSaveInfrastructure = async (items) => {
    setSaving(true)
    try {
      const updatedProfile = { ...profile, infrastructure_items: items }
      await updateConfig({ profile: updatedProfile })
      setProfile(updatedProfile)
      setEditingSection(null)
      toast.success('Infrastructure updated')
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // Section 4: Compliance
  const handleUpdateCompliance = async (data) => {
    setSaving(true)
    try {
      const updatedProfile = { ...profile, compliance: data }
      await updateConfig({ profile: updatedProfile })
      setProfile(updatedProfile)
      setEditingSection(null)
      toast.success('Compliance updated')
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // Import JSON
  const handleImportJSON = () => {
    try {
      const imported = JSON.parse(jsonInput)
      setProfile(imported)
      setShowImportModal(false)
      toast.success('Profile imported successfully')
    } catch (error) {
      toast.error('Invalid JSON format')
    }
  }

  // TagInput Component for arrays
  const TagInput = ({ values = [], onChange, placeholder = 'Add item' }) => {
    const [input, setInput] = useState('')

    const handleAdd = () => {
      const trimmed = input.trim()
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed])
        setInput('')
      }
    }

    const handleRemove = (index) => {
      onChange(values.filter((_, i) => i !== index))
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 13,
              color: '#fff'
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            style={{
              padding: '10px 16px',
              background: 'rgba(96,165,250,0.15)',
              border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={14} color="#60a5fa" />
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {values.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '6px 12px',
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 6,
                fontSize: 12,
                color: '#c4b5fd',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {item}
              <X
                size={14}
                style={{ cursor: 'pointer' }}
                onClick={() => handleRemove(idx)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Section 1 Editor: Basic Details
  const BasicDetailsEditor = () => {
    const initialData = profile?.basic_details || {}
    const [localData, setLocalData] = useState(initialData)

    const updateField = (field, value) => {
      setLocalData(prev => ({ ...prev, [field]: value }))
    }

    const updateOther = (values) => {
      setLocalData(prev => ({ ...prev, other: values }))
    }

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a2642 0%, #0f1829 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa' }}>
              Edit Basic Details
            </h3>
            <X
              size={20}
              style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
              onClick={() => setEditingSection(null)}
            />
          </div>

          {/* Content */}
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InputField
                label="Company Name"
                value={localData.company_name || ''}
                onChange={(v) => updateField('company_name', v)}
              />
              <InputField
                label="GST Number"
                value={localData.gst_number || ''}
                onChange={(v) => updateField('gst_number', v)}
              />
              <InputField
                label="Address"
                value={localData.address || ''}
                onChange={(v) => updateField('address', v)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <InputField
                  label="City"
                  value={localData.city || ''}
                  onChange={(v) => updateField('city', v)}
                />
                <InputField
                  label="State"
                  value={localData.state || ''}
                  onChange={(v) => updateField('state', v)}
                />
              </div>
              <InputField
                label="Pincode"
                value={localData.pincode || ''}
                onChange={(v) => updateField('pincode', v)}
              />
              <InputField
                label="Phone"
                value={localData.phone || ''}
                onChange={(v) => updateField('phone', v)}
              />
              <InputField
                label="Email"
                value={localData.email || ''}
                onChange={(v) => updateField('email', v)}
              />
              <InputField
                label="Website"
                value={localData.website || ''}
                onChange={(v) => updateField('website', v)}
              />

              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                  Other Details
                </label>
                <TagInput
                  values={localData.other || []}
                  onChange={updateOther}
                  placeholder="Add custom info"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setEditingSection(null)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                fontSize: 13,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleUpdateBasicDetails(localData)}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Section 2 Editor: Product Categories
  const ProductCategoriesEditor = () => {
    const initialCategories = profile?.product_categories || []
    const [categories, setCategories] = useState(initialCategories)
    const [expandedCategory, setExpandedCategory] = useState(null)

    const addCategory = () => {
      const newCategory = {
        name: '',
        products: []
      }
      setCategories([...categories, newCategory])
      setExpandedCategory(categories.length)
    }

    const updateCategoryName = (index, name) => {
      const updated = [...categories]
      updated[index] = { ...updated[index], name }
      setCategories(updated)
    }

    const deleteCategory = (index) => {
      setCategories(categories.filter((_, i) => i !== index))
      if (expandedCategory === index) setExpandedCategory(null)
    }

    const addProductToCategory = (catIndex) => {
      const updated = [...categories]
      updated[catIndex].products.push({
        name: '',
        description: '',
        other: ''
      })
      setCategories(updated)
    }

    const updateProduct = (catIndex, prodIndex, field, value) => {
      const updated = [...categories]
      updated[catIndex].products[prodIndex][field] = value
      setCategories(updated)
    }

    const deleteProduct = (catIndex, prodIndex) => {
      const updated = [...categories]
      updated[catIndex].products = updated[catIndex].products.filter((_, i) => i !== prodIndex)
      setCategories(updated)
    }

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a2642 0%, #0f1829 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 900,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
              Edit Product Categories
            </h3>
            <X
              size={20}
              style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
              onClick={() => setEditingSection(null)}
            />
          </div>

          {/* Content */}
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {categories.map((cat, catIdx) => (
                <div key={catIdx} style={{
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 12,
                  padding: 16
                }}>
                  {/* Category Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Tag size={16} color="#10b981" />
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => updateCategoryName(catIdx, e.target.value)}
                      placeholder="Category name (e.g., Apparel, Accessories)"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#10b981'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(expandedCategory === catIdx ? null : catIdx)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 6,
                        fontSize: 11,
                        color: '#10b981',
                        cursor: 'pointer'
                      }}
                    >
                      {expandedCategory === catIdx ? 'Collapse' : 'Expand'}
                    </button>
                    <Trash2
                      size={16}
                      style={{ cursor: 'pointer', color: '#ef4444' }}
                      onClick={() => deleteCategory(catIdx)}
                    />
                  </div>

                  {/* Products under category */}
                  {expandedCategory === catIdx && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {cat.products.map((prod, prodIdx) => (
                        <div key={prodIdx} style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          padding: 12
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <input
                              type="text"
                              value={prod.name}
                              onChange={(e) => updateProduct(catIdx, prodIdx, 'name', e.target.value)}
                              placeholder="Product name"
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 6,
                                fontSize: 13,
                                color: '#fff'
                              }}
                            />
                            <Trash2
                              size={14}
                              style={{ cursor: 'pointer', color: '#ef4444' }}
                              onClick={() => deleteProduct(catIdx, prodIdx)}
                            />
                          </div>
                          <input
                            type="text"
                            value={prod.description}
                            onChange={(e) => updateProduct(catIdx, prodIdx, 'description', e.target.value)}
                            placeholder="Description"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 6,
                              fontSize: 12,
                              color: 'rgba(255,255,255,0.7)',
                              marginBottom: 6
                            }}
                          />
                          <input
                            type="text"
                            value={prod.other}
                            onChange={(e) => updateProduct(catIdx, prodIdx, 'other', e.target.value)}
                            placeholder="Other info"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 6,
                              fontSize: 12,
                              color: 'rgba(255,255,255,0.5)'
                            }}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addProductToCategory(catIdx)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(96,165,250,0.1)',
                          border: '1px solid rgba(96,165,250,0.3)',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#60a5fa',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Plus size={14} />
                        Add Product
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addCategory}
                style={{
                  padding: '12px',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#10b981',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Plus size={16} />
                Add Category
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setEditingSection(null)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                fontSize: 13,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveProductCategories(categories)}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Categories'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Section 3 Editor: Infrastructure
  const InfrastructureEditor = () => {
    const initialItems = profile?.infrastructure_items || []
    const availableCategories = (profile?.product_categories || []).map(c => c.name).filter(n => n)
    const [items, setItems] = useState(initialItems)

    const addInfraItem = () => {
      setItems([...items, {
        name: '',
        details: {},
        tagged_categories: []
      }])
    }

    const updateItemField = (index, field, value) => {
      const updated = [...items]
      updated[index][field] = value
      setItems(updated)
    }

    const updateItemDetail = (index, key, value) => {
      const updated = [...items]
      updated[index].details[key] = value
      setItems(updated)
    }

    const deleteItem = (index) => {
      setItems(items.filter((_, i) => i !== index))
    }

    const toggleCategory = (itemIndex, category) => {
      const updated = [...items]
      const tags = updated[itemIndex].tagged_categories || []
      if (tags.includes(category)) {
        updated[itemIndex].tagged_categories = tags.filter(t => t !== category)
      } else {
        updated[itemIndex].tagged_categories = [...tags, category]
      }
      setItems(updated)
    }

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a2642 0%, #0f1829 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 900,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>
              Edit Infrastructure
            </h3>
            <X
              size={20}
              style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
              onClick={() => setEditingSection(null)}
            />
          </div>

          {/* Content */}
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            {availableCategories.length === 0 && (
              <div style={{
                padding: 16,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 13,
                color: '#f59e0b'
              }}>
                ⚠️ No product categories defined. Add categories in Section 2 first to tag infrastructure.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{
                  background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 12,
                  padding: 16
                }}>
                  {/* Item name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Factory size={16} color="#f59e0b" />
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItemField(idx, 'name', e.target.value)}
                      placeholder="Infrastructure name (e.g., Factory A, Warehouse 1)"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#f59e0b'
                      }}
                    />
                    <Trash2
                      size={16}
                      style={{ cursor: 'pointer', color: '#ef4444' }}
                      onClick={() => deleteItem(idx)}
                    />
                  </div>

                  {/* Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <input
                      type="text"
                      value={item.details?.area || ''}
                      onChange={(e) => updateItemDetail(idx, 'area', e.target.value)}
                      placeholder="Area (sq ft)"
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#fff'
                      }}
                    />
                    <input
                      type="text"
                      value={item.details?.machines || ''}
                      onChange={(e) => updateItemDetail(idx, 'machines', e.target.value)}
                      placeholder="Number of machines"
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#fff'
                      }}
                    />
                    <input
                      type="text"
                      value={item.details?.capacity || ''}
                      onChange={(e) => updateItemDetail(idx, 'capacity', e.target.value)}
                      placeholder="Production capacity"
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#fff'
                      }}
                    />
                    <input
                      type="text"
                      value={item.details?.workforce || ''}
                      onChange={(e) => updateItemDetail(idx, 'workforce', e.target.value)}
                      placeholder="Workforce size"
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#fff'
                      }}
                    />
                  </div>

                  {/* Tagged Categories */}
                  {availableCategories.length > 0 && (
                    <div>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, display: 'block' }}>
                        Tag product categories this infrastructure supports:
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {availableCategories.map((cat, catIdx) => {
                          const isSelected = (item.tagged_categories || []).includes(cat)
                          return (
                            <button
                              key={catIdx}
                              type="button"
                              onClick={() => toggleCategory(idx, cat)}
                              style={{
                                padding: '6px 12px',
                                background: isSelected ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${isSelected ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 6,
                                fontSize: 11,
                                color: isSelected ? '#10b981' : 'rgba(255,255,255,0.6)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              {isSelected && <Check size={12} />}
                              {cat}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addInfraItem}
                style={{
                  padding: '12px',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#f59e0b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Plus size={16} />
                Add Infrastructure
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setEditingSection(null)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                fontSize: 13,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveInfrastructure(items)}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Infrastructure'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Section 4 Editor: Compliance
  const ComplianceEditor = () => {
    const initialData = profile?.compliance || { certifications: [], other: [] }
    const [localData, setLocalData] = useState(initialData)

    const updateCertifications = (values) => {
      setLocalData(prev => ({ ...prev, certifications: values }))
    }

    const updateOther = (values) => {
      setLocalData(prev => ({ ...prev, other: values }))
    }

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a2642 0%, #0f1829 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#8b5cf6' }}>
              Edit Compliance & Certificates
            </h3>
            <X
              size={20}
              style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
              onClick={() => setEditingSection(null)}
            />
          </div>

          {/* Content */}
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                  Certifications
                </label>
                <TagInput
                  values={localData.certifications || []}
                  onChange={updateCertifications}
                  placeholder="Add certification (e.g., ISO 9001:2015)"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                  Other Compliance Details
                </label>
                <TagInput
                  values={localData.other || []}
                  onChange={updateOther}
                  placeholder="Add custom info"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setEditingSection(null)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                fontSize: 13,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleUpdateCompliance(localData)}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Compliance'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Input Field Component
  const InputField = ({ label, value, onChange, placeholder }) => (
    <div>
      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6, display: 'block' }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          fontSize: 13,
          color: '#fff'
        }}
      />
    </div>
  )

  // Section Card Component
  const SectionCard = ({ icon: Icon, title, accent, onEdit, children }) => (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: `linear-gradient(135deg, ${accent}15 0%, transparent 100%)`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon size={18} color={accent} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: accent }}>{title}</h3>
        </div>
        <button
          onClick={onEdit}
          style={{
            padding: '6px 12px',
            background: `${accent}20`,
            border: `1px solid ${accent}40`,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: accent,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Edit3 size={12} />
          Edit
        </button>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )

  // Import Modal
  const ImportModal = () => {
    const exampleJSON = {
      basic_details: {
        company_name: "Define Clothing Pvt Ltd",
        gst_number: "33XXXXX1234X1ZX",
        address: "123, Industrial Area, Muthanampalayam",
        city: "Tiruppur",
        state: "Tamil Nadu",
        pincode: "641607",
        phone: "+91 9876543210",
        email: "contact@defineclothing.com",
        website: "https://defineclothing.com",
        other: ["Established: 2015", "Annual Turnover: ₹5-10 Cr"]
      },
      product_categories: [
        {
          name: "Apparel",
          products: [
            { name: "T-Shirt", description: "Premium cotton t-shirts", other: "Available in all sizes" },
            { name: "Polo Shirt", description: "Business casual polo shirts", other: "Customization available" }
          ]
        },
        {
          name: "Accessories",
          products: [
            { name: "Caps", description: "Baseball caps", other: "Embroidery available" }
          ]
        }
      ],
      infrastructure_items: [
        {
          name: "Factory A",
          details: { area: "25000 sq ft", machines: "45", capacity: "50000 pieces/month", workforce: "120" },
          tagged_categories: ["Apparel"]
        },
        {
          name: "Warehouse 1",
          details: { area: "10000 sq ft", machines: "0", capacity: "Storage only", workforce: "10" },
          tagged_categories: ["Apparel", "Accessories"]
        }
      ],
      compliance: {
        certifications: ["ISO 9001:2015", "GOTS Certified", "OEKO-TEX Standard 100"],
        other: ["Last audit: March 2024", "Valid until: March 2026"]
      }
    }

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a2642 0%, #0f1829 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>Import Profile from JSON</h3>
            <X
              size={20}
              style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
              onClick={() => setShowImportModal(false)}
            />
          </div>

          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  Example Format (V4 Structure)
                </label>
                <button
                  onClick={() => setJsonInput(JSON.stringify(exampleJSON, null, 2))}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#10b981',
                    cursor: 'pointer'
                  }}
                >
                  Copy to Input
                </button>
              </div>
              <pre style={{
                padding: 16,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
                color: 'rgba(255,255,255,0.7)',
                overflowX: 'auto',
                maxHeight: 200
              }}>
                {JSON.stringify(exampleJSON, null, 2)}
              </pre>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                Paste JSON Here
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your profile JSON here..."
                style={{
                  width: '100%',
                  height: 200,
                  padding: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#fff',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setShowImportModal(false)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                fontSize: 13,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImportJSON}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Import Profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spinner size={32} color="rgba(255,255,255,0.3)" />
      </div>
    )
  }

  const basicDetails = profile?.basic_details || {}
  const productCategories = profile?.product_categories || []
  const infrastructureItems = profile?.infrastructure_items || []
  const compliance = profile?.compliance || { certifications: [], other: [] }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a1628', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(13,31,60,0.6)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            Business Profile V4
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            Basic Details • Product Categories • Infrastructure • Compliance
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleRefresh}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '10px 20px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(96,165,250,0.15)',
              border: '1px solid rgba(96,165,250,0.3)',
              color: '#60a5fa'
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '10px 20px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '1px solid rgba(16,185,129,0.3)'
            }}
          >
            <Upload size={14} />
            Import JSON
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ display: 'grid', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
          {/* Section 1: Basic Details */}
          <SectionCard
            icon={Building2}
            title="1. Basic Details"
            accent="#60a5fa"
            onEdit={() => setEditingSection('basic-details')}
          >
            {basicDetails.company_name ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <InfoRow label="Company" value={basicDetails.company_name} />
                <InfoRow label="GST" value={basicDetails.gst_number} />
                <InfoRow label="Address" value={`${basicDetails.address}, ${basicDetails.city}, ${basicDetails.state} ${basicDetails.pincode}`} />
                {basicDetails.phone && <InfoRow label="Phone" value={basicDetails.phone} />}
                {basicDetails.email && <InfoRow label="Email" value={basicDetails.email} />}
                {basicDetails.website && <InfoRow label="Website" value={basicDetails.website} />}
                {basicDetails.other && basicDetails.other.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Other:</div>
                    {basicDetails.other.map((item, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 12 }}>• {item}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No basic details yet. Click Edit to add.</p>
            )}
          </SectionCard>

          {/* Section 2: Product Categories */}
          <SectionCard
            icon={Package}
            title="2. Product Categories"
            accent="#10b981"
            onEdit={() => setEditingSection('products')}
          >
            {productCategories.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {productCategories.map((cat, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 8,
                    padding: 12
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag size={14} />
                      {cat.name}
                    </div>
                    {cat.products && cat.products.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {cat.products.map((prod, pidx) => (
                          <div key={pidx} style={{
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.7)',
                            paddingLeft: 12,
                            borderLeft: '2px solid rgba(16,185,129,0.3)'
                          }}>
                            <span style={{ fontWeight: 600 }}>{prod.name}</span>
                            {prod.description && <span style={{ color: 'rgba(255,255,255,0.5)' }}> — {prod.description}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingLeft: 12 }}>No products in this category</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No product categories yet. Click Edit to add.</p>
            )}
          </SectionCard>

          {/* Section 3: Infrastructure */}
          <SectionCard
            icon={Factory}
            title="3. Company Infrastructure"
            accent="#f59e0b"
            onEdit={() => setEditingSection('infrastructure')}
          >
            {infrastructureItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {infrastructureItems.map((item, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 8,
                    padding: 12
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>
                      {item.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                      {item.details?.area && <div>Area: {item.details.area}</div>}
                      {item.details?.machines && <div>Machines: {item.details.machines}</div>}
                      {item.details?.capacity && <div>Capacity: {item.details.capacity}</div>}
                      {item.details?.workforce && <div>Workforce: {item.details.workforce}</div>}
                    </div>
                    {item.tagged_categories && item.tagged_categories.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {item.tagged_categories.map((tag, tidx) => (
                          <span key={tidx} style={{
                            padding: '3px 8px',
                            background: 'rgba(16,185,129,0.15)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: 4,
                            fontSize: 10,
                            color: '#10b981'
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No infrastructure yet. Click Edit to add.</p>
            )}
          </SectionCard>

          {/* Section 4: Compliance */}
          <SectionCard
            icon={Award}
            title="4. Compliance & Certificates"
            accent="#8b5cf6"
            onEdit={() => setEditingSection('compliance')}
          >
            {compliance.certifications && compliance.certifications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Certifications:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {compliance.certifications.map((cert, i) => (
                      <div key={i} style={{
                        padding: '6px 12px',
                        background: 'rgba(139,92,246,0.15)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#c4b5fd'
                      }}>
                        ✅ {cert}
                      </div>
                    ))}
                  </div>
                </div>
                {compliance.other && compliance.other.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Other:</div>
                    {compliance.other.map((item, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 12 }}>• {item}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No compliance info yet. Click Edit to add.</p>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Modals */}
      {editingSection === 'basic-details' && <BasicDetailsEditor />}
      {editingSection === 'products' && <ProductCategoriesEditor />}
      {editingSection === 'infrastructure' && <InfrastructureEditor />}
      {editingSection === 'compliance' && <ComplianceEditor />}
      {showImportModal && <ImportModal />}
    </div>
  )
}

// Helper component
const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 12 }}>
    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 80 }}>{label}:</span>
    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', flex: 1 }}>{value}</span>
  </div>
)
