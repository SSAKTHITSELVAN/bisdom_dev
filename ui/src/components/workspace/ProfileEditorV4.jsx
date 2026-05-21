import { useState, useEffect, useMemo } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Save, Edit3, Building2, Package, MapPin, Plus, Trash2, X, Check,
  Factory, Award, Upload, FileText, RefreshCw, Tag, ChevronDown, ChevronRight
} from 'lucide-react'

/**
 * Profile V4 - Fixed input disappearing issue
 *
 * Root cause: Modal components were remounting on parent re-renders,
 * causing useState to reinitialize and lose user input.
 *
 * Fix: Use stable modal instances that don't remount, and properly
 * initialize state only once when modal opens.
 */

export default function ProfileEditorV4() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [expandedCategories, setExpandedCategories] = useState([])

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await getConfig()
      let profileData = res.data.profile || {}

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

  const handleRefresh = () => {
    loadProfile()
    toast.success('Profile refreshed')
  }

  // Save without updating local profile state immediately
  const saveProfile = async (updatedProfile) => {
    setSaving(true)
    try {
      await updateConfig({ profile: updatedProfile })
      // DON'T update profile here to prevent modal remount
      // setProfile(updatedProfile) - This causes the issue!
      toast.success('Saved successfully')
      return true
    } catch (error) {
      toast.error('Failed to save')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateBasicDetails = async (data) => {
    const success = await saveProfile({ ...profile, basic_details: data })
    if (success) {
      // Update profile only after closing modal
      setProfile(prev => ({ ...prev, basic_details: data }))
      setEditingSection(null)
    }
  }

  const handleSaveCategory = async (categoryData, categoryIndex = null) => {
    const categories = [...(profile?.product_categories || [])]
    if (categoryIndex !== null) {
      categories[categoryIndex] = categoryData
    } else {
      categories.push(categoryData)
    }
    const success = await saveProfile({ ...profile, product_categories: categories })
    if (success) {
      setProfile(prev => ({ ...prev, product_categories: categories }))
      setEditingSection(null)
      setEditingItem(null)
    }
  }

  const handleDeleteCategory = async (index) => {
    if (confirm('Delete this category and all its products?')) {
      const categories = (profile?.product_categories || []).filter((_, i) => i !== index)
      const success = await saveProfile({ ...profile, product_categories: categories })
      if (success) {
        setProfile(prev => ({ ...prev, product_categories: categories }))
      }
    }
  }

  const handleSaveProduct = async (productData, categoryIndex, productIndex = null) => {
    const categories = [...(profile?.product_categories || [])]
    const category = { ...categories[categoryIndex] }

    if (productIndex !== null) {
      category.products[productIndex] = productData
    } else {
      category.products = [...(category.products || []), productData]
    }

    categories[categoryIndex] = category
    const success = await saveProfile({ ...profile, product_categories: categories })
    if (success) {
      setProfile(prev => ({ ...prev, product_categories: categories }))
      setEditingSection(null)
      setEditingItem(null)
    }
  }

  const handleDeleteProduct = async (categoryIndex, productIndex) => {
    if (confirm('Delete this product?')) {
      const categories = [...(profile?.product_categories || [])]
      const category = { ...categories[categoryIndex] }
      category.products = category.products.filter((_, i) => i !== productIndex)
      categories[categoryIndex] = category
      const success = await saveProfile({ ...profile, product_categories: categories })
      if (success) {
        setProfile(prev => ({ ...prev, product_categories: categories }))
      }
    }
  }

  const handleSaveInfrastructure = async (infraData, index = null) => {
    const items = [...(profile?.infrastructure_items || [])]
    if (index !== null) {
      items[index] = infraData
    } else {
      items.push(infraData)
    }
    const success = await saveProfile({ ...profile, infrastructure_items: items })
    if (success) {
      setProfile(prev => ({ ...prev, infrastructure_items: items }))
      setEditingSection(null)
      setEditingItem(null)
    }
  }

  const handleDeleteInfrastructure = async (index) => {
    if (confirm('Delete this infrastructure?')) {
      const items = (profile?.infrastructure_items || []).filter((_, i) => i !== index)
      const success = await saveProfile({ ...profile, infrastructure_items: items })
      if (success) {
        setProfile(prev => ({ ...prev, infrastructure_items: items }))
      }
    }
  }

  const handleUpdateCompliance = async (data) => {
    const success = await saveProfile({ ...profile, compliance: data })
    if (success) {
      setProfile(prev => ({ ...prev, compliance: data }))
      setEditingSection(null)
    }
  }

  const handleImportJSON = () => {
    try {
      const imported = JSON.parse(jsonInput)
      setProfile(imported)
      setShowImportModal(false)
      toast.success('Profile imported')
    } catch (error) {
      toast.error('Invalid JSON')
    }
  }

  const toggleCategory = (index) => {
    if (expandedCategories.includes(index)) {
      setExpandedCategories(expandedCategories.filter(i => i !== index))
    } else {
      setExpandedCategories([...expandedCategories, index])
    }
  }

  // TagInput Component
  const TagInput = ({ values = [], onChange, placeholder = 'Add item' }) => {
    const [input, setInput] = useState('')

    const handleAdd = () => {
      const trimmed = input.trim()
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed])
        setInput('')
      }
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              fontSize: 14,
              color: '#fff'
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            style={{
              padding: '12px 18px',
              background: 'rgba(96,165,250,0.2)',
              border: '1px solid rgba(96,165,250,0.4)',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} color="#60a5fa" />
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {values.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '8px 14px',
                background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: 6,
                fontSize: 13,
                color: '#e9d5ff',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {item}
              <X
                size={14}
                style={{ cursor: 'pointer' }}
                onClick={() => onChange(values.filter((_, i) => i !== idx))}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Basic Details Editor - Use key prop to control mounting
  const BasicDetailsEditor = ({ initialData, onSave, onClose }) => {
    const [localData, setLocalData] = useState(initialData)

    return (
      <Modal
        title="Edit Basic Details"
        accent="#60a5fa"
        onClose={onClose}
        onSave={() => onSave(localData)}
        saving={saving}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <InputField label="Company Name" value={localData.company_name || ''} onChange={(v) => setLocalData(prev => ({ ...prev, company_name: v }))} />
          <InputField label="GST Number" value={localData.gst_number || ''} onChange={(v) => setLocalData(prev => ({ ...prev, gst_number: v }))} />
          <InputField label="Address" value={localData.address || ''} onChange={(v) => setLocalData(prev => ({ ...prev, address: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <InputField label="City" value={localData.city || ''} onChange={(v) => setLocalData(prev => ({ ...prev, city: v }))} />
            <InputField label="State" value={localData.state || ''} onChange={(v) => setLocalData(prev => ({ ...prev, state: v }))} />
          </div>
          <InputField label="Pincode" value={localData.pincode || ''} onChange={(v) => setLocalData(prev => ({ ...prev, pincode: v }))} />
          <InputField label="Phone" value={localData.phone || ''} onChange={(v) => setLocalData(prev => ({ ...prev, phone: v }))} />
          <InputField label="Email" value={localData.email || ''} onChange={(v) => setLocalData(prev => ({ ...prev, email: v }))} />
          <InputField label="Website" value={localData.website || ''} onChange={(v) => setLocalData(prev => ({ ...prev, website: v }))} />
          <div>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, display: 'block', fontWeight: 600 }}>Other Details</label>
            <TagInput values={localData.other || []} onChange={(v) => setLocalData(prev => ({ ...prev, other: v }))} placeholder="Add custom info" />
          </div>
        </div>
      </Modal>
    )
  }

  // Category Name Editor
  const CategoryNameEditor = ({ initialName, onSave, onClose, isNew }) => {
    const [name, setName] = useState(initialName || '')

    return (
      <Modal
        title={isNew ? "Add Category" : "Edit Category Name"}
        accent="#10b981"
        onClose={onClose}
        onSave={() => onSave(name)}
        saving={saving}
        size="small"
      >
        <InputField
          label="Category Name"
          value={name}
          onChange={setName}
          placeholder="e.g., Apparel, Accessories, Home Textiles"
        />
      </Modal>
    )
  }

  // Product Editor
  const ProductEditor = ({ initialProduct, onSave, onClose, isNew }) => {
    const [localData, setLocalData] = useState(initialProduct || {
      name: '',
      gsm: '',
      fabric_type: '',
      color: '',
      size_range: '',
      moq: '',
      description: '',
      other: ''
    })

    return (
      <Modal
        title={isNew ? "Add Product" : "Edit Product"}
        accent="#10b981"
        onClose={onClose}
        onSave={() => onSave(localData)}
        saving={saving}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <InputField
            label="Product Name *"
            value={localData.name}
            onChange={(v) => setLocalData(prev => ({ ...prev, name: v }))}
            placeholder="e.g., T-Shirt, Polo Shirt"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <InputField
              label="GSM (Fabric Weight)"
              value={localData.gsm}
              onChange={(v) => setLocalData(prev => ({ ...prev, gsm: v }))}
              placeholder="e.g., 180 GSM"
            />
            <InputField
              label="Fabric Type"
              value={localData.fabric_type}
              onChange={(v) => setLocalData(prev => ({ ...prev, fabric_type: v }))}
              placeholder="e.g., Cotton, Polyester"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <InputField
              label="Color Options"
              value={localData.color}
              onChange={(v) => setLocalData(prev => ({ ...prev, color: v }))}
              placeholder="e.g., Black, White, Navy"
            />
            <InputField
              label="Size Range"
              value={localData.size_range}
              onChange={(v) => setLocalData(prev => ({ ...prev, size_range: v }))}
              placeholder="e.g., S to XXL"
            />
          </div>

          <InputField
            label="MOQ (Minimum Order Quantity)"
            value={localData.moq}
            onChange={(v) => setLocalData(prev => ({ ...prev, moq: v }))}
            placeholder="e.g., 500 pieces"
          />

          <div>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, display: 'block', fontWeight: 600 }}>Description</label>
            <textarea
              value={localData.description}
              onChange={(e) => setLocalData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed product description..."
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                fontSize: 14,
                color: '#fff',
                minHeight: 100,
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <InputField
            label="Other Info"
            value={localData.other}
            onChange={(v) => setLocalData(prev => ({ ...prev, other: v }))}
            placeholder="Any additional information"
          />
        </div>
      </Modal>
    )
  }

  // Infrastructure Editor
  const InfrastructureEditor = ({ initialItem, onSave, onClose, isNew, availableCategories }) => {
    const [localData, setLocalData] = useState(initialItem || {
      name: '',
      details: { area: '', machines: '', capacity: '', workforce: '' },
      tagged_categories: []
    })

    const toggleCategory = (category) => {
      const tags = localData.tagged_categories || []
      if (tags.includes(category)) {
        setLocalData(prev => ({
          ...prev,
          tagged_categories: tags.filter(t => t !== category)
        }))
      } else {
        setLocalData(prev => ({
          ...prev,
          tagged_categories: [...tags, category]
        }))
      }
    }

    return (
      <Modal
        title={isNew ? "Add Infrastructure" : "Edit Infrastructure"}
        accent="#f59e0b"
        onClose={onClose}
        onSave={() => onSave(localData)}
        saving={saving}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {availableCategories.length === 0 && (
            <div style={{
              padding: 14,
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: 8,
              fontSize: 13,
              color: '#fbbf24'
            }}>
              ⚠️ No product categories defined. Add categories in Section 2 first.
            </div>
          )}

          <InputField
            label="Infrastructure Name"
            value={localData.name}
            onChange={(v) => setLocalData(prev => ({ ...prev, name: v }))}
            placeholder="e.g., Factory A, Warehouse 1, Dyeing Unit"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <InputField
              label="Area (sq ft)"
              value={localData.details?.area || ''}
              onChange={(v) => setLocalData(prev => ({ ...prev, details: { ...prev.details, area: v } }))}
            />
            <InputField
              label="Number of Machines"
              value={localData.details?.machines || ''}
              onChange={(v) => setLocalData(prev => ({ ...prev, details: { ...prev.details, machines: v } }))}
            />
            <InputField
              label="Production Capacity"
              value={localData.details?.capacity || ''}
              onChange={(v) => setLocalData(prev => ({ ...prev, details: { ...prev.details, capacity: v } }))}
              placeholder="e.g., 50000 pcs/month"
            />
            <InputField
              label="Workforce Size"
              value={localData.details?.workforce || ''}
              onChange={(v) => setLocalData(prev => ({ ...prev, details: { ...prev.details, workforce: v } }))}
            />
          </div>

          {availableCategories.length > 0 && (
            <div>
              <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, display: 'block', fontWeight: 600 }}>
                Tag Product Categories
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {availableCategories.map((cat, idx) => {
                  const isSelected = (localData.tagged_categories || []).includes(cat)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: '10px 16px',
                        background: isSelected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isSelected ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.15)'}`,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        color: isSelected ? '#6ee7b7' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {isSelected && <Check size={14} />}
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    )
  }

  // Compliance Editor
  const ComplianceEditor = ({ initialData, onSave, onClose }) => {
    const [localData, setLocalData] = useState(initialData)

    return (
      <Modal
        title="Edit Compliance & Certificates"
        accent="#8b5cf6"
        onClose={onClose}
        onSave={() => onSave(localData)}
        saving={saving}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, display: 'block', fontWeight: 600 }}>Certifications</label>
            <TagInput
              values={localData.certifications || []}
              onChange={(v) => setLocalData(prev => ({ ...prev, certifications: v }))}
              placeholder="Add certification (e.g., ISO 9001:2015, GOTS)"
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, display: 'block', fontWeight: 600 }}>Other Compliance Details</label>
            <TagInput
              values={localData.other || []}
              onChange={(v) => setLocalData(prev => ({ ...prev, other: v }))}
              placeholder="Add custom info"
            />
          </div>
        </div>
      </Modal>
    )
  }

  // Modal Component
  const Modal = ({ title, accent, onClose, onSave, saving, children, size = 'medium' }) => {
    const maxWidth = size === 'large' ? 900 : size === 'small' ? 500 : 700

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16,
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: accent }}>{title}</h3>
            <X size={22} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={onClose} />
          </div>
          <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
            {children}
          </div>
          <div style={{
            padding: '18px 28px',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
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

  // Input Field Component
  const InputField = ({ label, value, onChange, placeholder }) => (
    <div>
      <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, display: 'block', fontWeight: 600 }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          fontSize: 14,
          color: '#fff'
        }}
      />
    </div>
  )

  // Import Modal
  const ImportModal = () => {
    const exampleJSON = {
      basic_details: {
        company_name: "Define Clothing Pvt Ltd",
        gst_number: "33XXXXX1234X1ZX",
        address: "123, Industrial Area",
        city: "Tiruppur",
        state: "Tamil Nadu",
        pincode: "641607",
        phone: "+91 9876543210",
        email: "contact@defineclothing.com",
        website: "https://defineclothing.com",
        other: ["Established: 2015"]
      },
      product_categories: [
        {
          name: "Apparel",
          products: [
            {
              name: "T-Shirt",
              gsm: "180 GSM",
              fabric_type: "Cotton",
              color: "All colors",
              size_range: "S to XXL",
              moq: "500 pieces",
              description: "Premium quality cotton t-shirts",
              other: "Customization available"
            }
          ]
        }
      ],
      infrastructure_items: [
        {
          name: "Factory A",
          details: { area: "25000 sq ft", machines: "45", capacity: "50000 pcs/month", workforce: "120" },
          tagged_categories: ["Apparel"]
        }
      ],
      compliance: {
        certifications: ["ISO 9001:2015", "GOTS Certified"],
        other: ["Last audit: March 2024"]
      }
    }

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 850,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#10b981' }}>Import Profile from JSON</h3>
            <X size={22} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }} onClick={() => setShowImportModal(false)} />
          </div>
          <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Example Format</label>
                <button
                  onClick={() => setJsonInput(JSON.stringify(exampleJSON, null, 2))}
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(16,185,129,0.2)',
                    border: '1px solid rgba(16,185,129,0.4)',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6ee7b7',
                    cursor: 'pointer'
                  }}
                >
                  Copy to Input
                </button>
              </div>
              <pre style={{
                padding: 18,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                fontSize: 12,
                color: 'rgba(255,255,255,0.8)',
                overflowX: 'auto',
                maxHeight: 220
              }}>
                {JSON.stringify(exampleJSON, null, 2)}
              </pre>
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, display: 'block', fontWeight: 600 }}>Paste JSON Here</label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your JSON..."
                style={{
                  width: '100%',
                  height: 220,
                  padding: 16,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: '#fff',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
          <div style={{
            padding: '18px 28px',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setShowImportModal(false)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImportJSON}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Import
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spinner size={36} color="rgba(255,255,255,0.4)" />
      </div>
    )
  }

  const basicDetails = profile?.basic_details || {}
  const productCategories = profile?.product_categories || []
  const infrastructureItems = profile?.infrastructure_items || []
  const compliance = profile?.compliance || { certifications: [], other: [] }

  // Compute available categories for infrastructure tagging
  const availableCategories = useMemo(() =>
    productCategories.map(c => c.name).filter(n => n),
    [productCategories]
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '28px 36px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(15,23,42,0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Business Profile
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Manage your company details, products, infrastructure & compliance
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(96,165,250,0.15)',
              border: '1px solid rgba(96,165,250,0.4)',
              borderRadius: 10,
              color: '#93c5fd',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '1px solid rgba(16,185,129,0.4)',
              borderRadius: 10,
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <Upload size={16} />
            Import JSON
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '36px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1500, margin: '0 auto' }}>

          {/* Section 1: Basic Details */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(30,41,59,0.6) 100%)',
            border: '1px solid rgba(96,165,250,0.25)',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Building2 size={22} color="#60a5fa" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#93c5fd' }}>1. Basic Details</h3>
              </div>
              <button
                onClick={() => setEditingSection('basic-details')}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(96,165,250,0.2)',
                  border: '1px solid rgba(96,165,250,0.4)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#93c5fd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Edit3 size={15} />
                Edit
              </button>
            </div>
            <div style={{ padding: '28px' }}>
              {basicDetails.company_name ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
                  <InfoItem label="Company" value={basicDetails.company_name} />
                  <InfoItem label="GST" value={basicDetails.gst_number} />
                  <InfoItem label="City" value={basicDetails.city} />
                  <InfoItem label="State" value={basicDetails.state} />
                  {basicDetails.phone && <InfoItem label="Phone" value={basicDetails.phone} />}
                  {basicDetails.email && <InfoItem label="Email" value={basicDetails.email} />}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '24px 0' }}>
                  No details yet. Click Edit to add company information.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Product Categories */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(30,41,59,0.6) 100%)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Package size={22} color="#10b981" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#6ee7b7' }}>2. Product Categories</h3>
              </div>
              <button
                onClick={() => {
                  setEditingSection('add-category')
                  setEditingItem(null)
                }}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(16,185,129,0.2)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6ee7b7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Plus size={15} />
                Add Category
              </button>
            </div>
            <div style={{ padding: '28px' }}>
              {productCategories.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {productCategories.map((cat, catIdx) => (
                    <div key={catIdx} style={{
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: 12,
                      overflow: 'hidden'
                    }}>
                      {/* Category Header */}
                      <div style={{
                        padding: '18px 22px',
                        background: 'rgba(16,185,129,0.08)',
                        borderBottom: expandedCategories.includes(catIdx) ? '1px solid rgba(16,185,129,0.25)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button
                            onClick={() => toggleCategory(catIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            {expandedCategories.includes(catIdx) ? (
                              <ChevronDown size={18} color="#6ee7b7" />
                            ) : (
                              <ChevronRight size={18} color="#6ee7b7" />
                            )}
                          </button>
                          <Tag size={18} color="#10b981" />
                          <h4 style={{ fontSize: 15, fontWeight: 700, color: '#6ee7b7' }}>{cat.name}</h4>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                            ({(cat.products || []).length} products)
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => {
                              setEditingSection('add-product')
                              setEditingItem({ categoryIndex: catIdx })
                            }}
                            style={{
                              padding: '8px 16px',
                              background: 'rgba(16,185,129,0.2)',
                              border: '1px solid rgba(16,185,129,0.4)',
                              borderRadius: 7,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#6ee7b7',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Plus size={13} />
                            Add Product
                          </button>
                          <button
                            onClick={() => {
                              setEditingSection('edit-category')
                              setEditingItem({ data: cat, index: catIdx })
                            }}
                            style={{
                              padding: '8px 12px',
                              background: 'rgba(96,165,250,0.2)',
                              border: '1px solid rgba(96,165,250,0.4)',
                              borderRadius: 7,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={14} color="#60a5fa" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(catIdx)}
                            style={{
                              padding: '8px 12px',
                              background: 'rgba(239,68,68,0.2)',
                              border: '1px solid rgba(239,68,68,0.4)',
                              borderRadius: 7,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      </div>

                      {/* Products List */}
                      {expandedCategories.includes(catIdx) && (
                        <div style={{ padding: '20px 22px' }}>
                          {cat.products && cat.products.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
                              {cat.products.map((prod, prodIdx) => (
                                <div key={prodIdx} style={{
                                  padding: '16px 18px',
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  borderRadius: 10
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                    <h5 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', flex: 1 }}>{prod.name}</h5>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button
                                        onClick={() => {
                                          setEditingSection('edit-product')
                                          setEditingItem({ data: prod, categoryIndex: catIdx, productIndex: prodIdx })
                                        }}
                                        style={{
                                          padding: '6px 10px',
                                          background: 'rgba(96,165,250,0.2)',
                                          border: '1px solid rgba(96,165,250,0.4)',
                                          borderRadius: 6,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <Edit3 size={12} color="#60a5fa" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteProduct(catIdx, prodIdx)}
                                        style={{
                                          padding: '6px 10px',
                                          background: 'rgba(239,68,68,0.2)',
                                          border: '1px solid rgba(239,68,68,0.4)',
                                          borderRadius: 6,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <Trash2 size={12} color="#ef4444" />
                                      </button>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                                    {prod.gsm && <ProductDetail label="GSM" value={prod.gsm} />}
                                    {prod.fabric_type && <ProductDetail label="Fabric" value={prod.fabric_type} />}
                                    {prod.color && <ProductDetail label="Colors" value={prod.color} />}
                                    {prod.size_range && <ProductDetail label="Sizes" value={prod.size_range} />}
                                    {prod.moq && <ProductDetail label="MOQ" value={prod.moq} />}
                                    {prod.description && (
                                      <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 4 }}>Description:</div>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 1.5 }}>{prod.description}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                              No products in this category. Click "Add Product" above.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '24px 0' }}>
                  No categories yet. Click "Add Category" to create your first product category.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Infrastructure */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(30,41,59,0.6) 100%)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Factory size={22} color="#f59e0b" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>3. Infrastructure</h3>
              </div>
              <button
                onClick={() => {
                  setEditingSection('add-infrastructure')
                  setEditingItem(null)
                }}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(245,158,11,0.2)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fbbf24',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Plus size={15} />
                Add Infrastructure
              </button>
            </div>
            <div style={{ padding: '28px' }}>
              {infrastructureItems.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 18 }}>
                  {infrastructureItems.map((item, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 12,
                      padding: '20px 22px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>{item.name}</h4>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => {
                              setEditingSection('edit-infrastructure')
                              setEditingItem({ data: item, index: idx })
                            }}
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(96,165,250,0.2)',
                              border: '1px solid rgba(96,165,250,0.4)',
                              borderRadius: 7,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={13} color="#60a5fa" />
                          </button>
                          <button
                            onClick={() => handleDeleteInfrastructure(idx)}
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(239,68,68,0.2)',
                              border: '1px solid rgba(239,68,68,0.4)',
                              borderRadius: 7,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 14 }}>
                        {item.details?.area && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Area:</span> {item.details.area}</div>}
                        {item.details?.machines && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Machines:</span> {item.details.machines}</div>}
                        {item.details?.capacity && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Capacity:</span> {item.details.capacity}</div>}
                        {item.details?.workforce && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Workforce:</span> {item.details.workforce}</div>}
                      </div>
                      {item.tagged_categories && item.tagged_categories.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {item.tagged_categories.map((tag, tidx) => (
                            <span key={tidx} style={{
                              padding: '6px 12px',
                              background: 'rgba(16,185,129,0.25)',
                              border: '1px solid rgba(16,185,129,0.5)',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#6ee7b7'
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
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '24px 0' }}>
                  No infrastructure yet. Click "Add Infrastructure" to add factories, warehouses, etc.
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Compliance */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(30,41,59,0.6) 100%)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Award size={22} color="#8b5cf6" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#c4b5fd' }}>4. Compliance & Certificates</h3>
              </div>
              <button
                onClick={() => setEditingSection('compliance')}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#c4b5fd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Edit3 size={15} />
                Edit
              </button>
            </div>
            <div style={{ padding: '28px' }}>
              {compliance.certifications && compliance.certifications.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {compliance.certifications.map((cert, i) => (
                    <div key={i} style={{
                      padding: '12px 18px',
                      background: 'rgba(139,92,246,0.2)',
                      border: '1px solid rgba(139,92,246,0.4)',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#e9d5ff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}>
                      <Check size={16} color="#8b5cf6" />
                      {cert}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '24px 0' }}>
                  No certifications yet. Click Edit to add compliance information.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modals - Use key prop based on editingSection to prevent remounting issues */}
      {editingSection === 'basic-details' && (
        <BasicDetailsEditor
          key="basic-details"
          initialData={basicDetails}
          onSave={handleUpdateBasicDetails}
          onClose={() => setEditingSection(null)}
        />
      )}
      {(editingSection === 'add-category' || editingSection === 'edit-category') && (
        <CategoryNameEditor
          key={`${editingSection}-${editingItem?.index}`}
          initialName={editingItem?.data?.name}
          isNew={editingSection === 'add-category'}
          onSave={(name) => {
            const categoryData = editingItem?.data
              ? { ...editingItem.data, name }
              : { name, products: [] }
            handleSaveCategory(categoryData, editingItem?.index ?? null)
          }}
          onClose={() => { setEditingSection(null); setEditingItem(null) }}
        />
      )}
      {(editingSection === 'add-product' || editingSection === 'edit-product') && (
        <ProductEditor
          key={`${editingSection}-${editingItem?.categoryIndex}-${editingItem?.productIndex}`}
          initialProduct={editingItem?.data}
          isNew={editingSection === 'add-product'}
          onSave={(product) => handleSaveProduct(product, editingItem?.categoryIndex, editingItem?.productIndex ?? null)}
          onClose={() => { setEditingSection(null); setEditingItem(null) }}
        />
      )}
      {(editingSection === 'add-infrastructure' || editingSection === 'edit-infrastructure') && (
        <InfrastructureEditor
          key={`${editingSection}-${editingItem?.index}`}
          initialItem={editingItem?.data}
          isNew={editingSection === 'add-infrastructure'}
          availableCategories={availableCategories}
          onSave={(infra) => handleSaveInfrastructure(infra, editingItem?.index ?? null)}
          onClose={() => { setEditingSection(null); setEditingItem(null) }}
        />
      )}
      {editingSection === 'compliance' && (
        <ComplianceEditor
          key="compliance"
          initialData={compliance}
          onSave={handleUpdateCompliance}
          onClose={() => setEditingSection(null)}
        />
      )}
      {showImportModal && <ImportModal />}
    </div>
  )
}

// Helper components
const InfoItem = ({ label, value }) => (
  <div style={{
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10
  }}>
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
      {label}
    </div>
    <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>
      {value || '—'}
    </div>
  </div>
)

const ProductDetail = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    <span style={{ color: 'rgba(255,255,255,0.45)', minWidth: 60 }}>{label}:</span>
    <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{value}</span>
  </div>
)
