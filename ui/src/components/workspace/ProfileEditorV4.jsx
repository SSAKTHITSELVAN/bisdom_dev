import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Save, Edit3, Building2, Package, MapPin, Plus, Trash2, X, Check,
  Factory, Award, Upload, FileText, RefreshCw, Tag
} from 'lucide-react'

/**
 * Profile Structure V4 - Enhanced UI
 *
 * 1. Basic Details - Company info
 * 2. Product Categories - Add categories, then products under each
 * 3. Infrastructure - Multiple items with individual edit
 * 4. Compliance - Certifications
 */

export default function ProfileEditorV4() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
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

  // Save functions
  const saveProfile = async (updatedProfile) => {
    setSaving(true)
    try {
      await updateConfig({ profile: updatedProfile })
      setProfile(updatedProfile)
      toast.success('Saved successfully')
    } catch (error) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateBasicDetails = async (data) => {
    await saveProfile({ ...profile, basic_details: data })
    setEditingSection(null)
  }

  const handleSaveCategory = (categoryData, index = null) => {
    const categories = [...(profile?.product_categories || [])]
    if (index !== null) {
      categories[index] = categoryData
    } else {
      categories.push(categoryData)
    }
    saveProfile({ ...profile, product_categories: categories })
    setEditingSection(null)
    setEditingItem(null)
  }

  const handleDeleteCategory = (index) => {
    const categories = (profile?.product_categories || []).filter((_, i) => i !== index)
    saveProfile({ ...profile, product_categories: categories })
  }

  const handleSaveInfrastructure = (infraData, index = null) => {
    const items = [...(profile?.infrastructure_items || [])]
    if (index !== null) {
      items[index] = infraData
    } else {
      items.push(infraData)
    }
    saveProfile({ ...profile, infrastructure_items: items })
    setEditingSection(null)
    setEditingItem(null)
  }

  const handleDeleteInfrastructure = (index) => {
    const items = (profile?.infrastructure_items || []).filter((_, i) => i !== index)
    saveProfile({ ...profile, infrastructure_items: items })
  }

  const handleUpdateCompliance = async (data) => {
    await saveProfile({ ...profile, compliance: data })
    setEditingSection(null)
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
              cursor: 'pointer'
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
                onClick={() => onChange(values.filter((_, i) => i !== idx))}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Basic Details Editor
  const BasicDetailsEditor = () => {
    const initialData = profile?.basic_details || {}
    const [localData, setLocalData] = useState(initialData)

    return (
      <Modal
        title="Edit Basic Details"
        accent="#60a5fa"
        onClose={() => setEditingSection(null)}
        onSave={() => handleUpdateBasicDetails(localData)}
        saving={saving}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InputField label="Company Name" value={localData.company_name || ''} onChange={(v) => setLocalData(prev => ({ ...prev, company_name: v }))} />
          <InputField label="GST Number" value={localData.gst_number || ''} onChange={(v) => setLocalData(prev => ({ ...prev, gst_number: v }))} />
          <InputField label="Address" value={localData.address || ''} onChange={(v) => setLocalData(prev => ({ ...prev, address: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InputField label="City" value={localData.city || ''} onChange={(v) => setLocalData(prev => ({ ...prev, city: v }))} />
            <InputField label="State" value={localData.state || ''} onChange={(v) => setLocalData(prev => ({ ...prev, state: v }))} />
          </div>
          <InputField label="Pincode" value={localData.pincode || ''} onChange={(v) => setLocalData(prev => ({ ...prev, pincode: v }))} />
          <InputField label="Phone" value={localData.phone || ''} onChange={(v) => setLocalData(prev => ({ ...prev, phone: v }))} />
          <InputField label="Email" value={localData.email || ''} onChange={(v) => setLocalData(prev => ({ ...prev, email: v }))} />
          <InputField label="Website" value={localData.website || ''} onChange={(v) => setLocalData(prev => ({ ...prev, website: v }))} />
          <div>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>Other Details</label>
            <TagInput values={localData.other || []} onChange={(v) => setLocalData(prev => ({ ...prev, other: v }))} placeholder="Add custom info" />
          </div>
        </div>
      </Modal>
    )
  }

  // Category Editor (Edit single category)
  const CategoryEditor = ({ category, categoryIndex }) => {
    const [localData, setLocalData] = useState(category || { name: '', products: [] })

    const addProduct = () => {
      setLocalData(prev => ({
        ...prev,
        products: [...prev.products, { name: '', description: '', other: '' }]
      }))
    }

    const updateProduct = (prodIndex, field, value) => {
      const updated = [...localData.products]
      updated[prodIndex][field] = value
      setLocalData(prev => ({ ...prev, products: updated }))
    }

    const deleteProduct = (prodIndex) => {
      setLocalData(prev => ({
        ...prev,
        products: prev.products.filter((_, i) => i !== prodIndex)
      }))
    }

    return (
      <Modal
        title={categoryIndex !== null ? "Edit Category" : "Add Category"}
        accent="#10b981"
        onClose={() => { setEditingSection(null); setEditingItem(null) }}
        onSave={() => handleSaveCategory(localData, categoryIndex)}
        saving={saving}
        size="large"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <InputField
            label="Category Name"
            value={localData.name}
            onChange={(v) => setLocalData(prev => ({ ...prev, name: v }))}
            placeholder="e.g., Apparel, Accessories"
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>Products in this category</label>
              <button
                type="button"
                onClick={addProduct}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#10b981',
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

            {localData.products.length === 0 ? (
              <div style={{
                padding: 16,
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: 8,
                textAlign: 'center',
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)'
              }}>
                No products yet. Click "Add Product" to add.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {localData.products.map((prod, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: 12
                  }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        value={prod.name}
                        onChange={(e) => updateProduct(idx, 'name', e.target.value)}
                        placeholder="Product name"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#fff'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => deleteProduct(idx)}
                        style={{
                          padding: '8px',
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={prod.description}
                      onChange={(e) => updateProduct(idx, 'description', e.target.value)}
                      placeholder="Description"
                      style={{
                        width: '100%',
                        padding: '6px 12px',
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
                      onChange={(e) => updateProduct(idx, 'other', e.target.value)}
                      placeholder="Other info"
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.5)'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    )
  }

  // Infrastructure Editor (Edit single infrastructure item)
  const InfrastructureEditor = ({ item, itemIndex }) => {
    const availableCategories = (profile?.product_categories || []).map(c => c.name).filter(n => n)
    const [localData, setLocalData] = useState(item || {
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
        title={itemIndex !== null ? "Edit Infrastructure" : "Add Infrastructure"}
        accent="#f59e0b"
        onClose={() => { setEditingSection(null); setEditingItem(null) }}
        onSave={() => handleSaveInfrastructure(localData, itemIndex)}
        saving={saving}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {availableCategories.length === 0 && (
            <div style={{
              padding: 12,
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8,
              fontSize: 12,
              color: '#f59e0b'
            }}>
              ⚠️ No product categories defined. Add categories in Section 2 first.
            </div>
          )}

          <InputField
            label="Infrastructure Name"
            value={localData.name}
            onChange={(v) => setLocalData(prev => ({ ...prev, name: v }))}
            placeholder="e.g., Factory A, Warehouse 1"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
            />
            <InputField
              label="Workforce Size"
              value={localData.details?.workforce || ''}
              onChange={(v) => setLocalData(prev => ({ ...prev, details: { ...prev.details, workforce: v } }))}
            />
          </div>

          {availableCategories.length > 0 && (
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                Tag Product Categories
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableCategories.map((cat, idx) => {
                  const isSelected = (localData.tagged_categories || []).includes(cat)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: '8px 14px',
                        background: isSelected ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isSelected ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 6,
                        fontSize: 12,
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
      </Modal>
    )
  }

  // Compliance Editor
  const ComplianceEditor = () => {
    const initialData = profile?.compliance || { certifications: [], other: [] }
    const [localData, setLocalData] = useState(initialData)

    return (
      <Modal
        title="Edit Compliance & Certificates"
        accent="#8b5cf6"
        onClose={() => setEditingSection(null)}
        onSave={() => handleUpdateCompliance(localData)}
        saving={saving}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>Certifications</label>
            <TagInput
              values={localData.certifications || []}
              onChange={(v) => setLocalData(prev => ({ ...prev, certifications: v }))}
              placeholder="Add certification (e.g., ISO 9001:2015)"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>Other Compliance Details</label>
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
    const maxWidth = size === 'large' ? 900 : 700

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
          maxWidth,
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: accent }}>{title}</h3>
            <X size={20} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }} onClick={onClose} />
          </div>
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            {children}
          </div>
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
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
              onClick={onSave}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
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

  // Input Field Component
  const InputField = ({ label, value, onChange, placeholder }) => (
    <div>
      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6, display: 'block' }}>{label}</label>
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
            { name: "T-Shirt", description: "Premium cotton", other: "All sizes" },
            { name: "Polo Shirt", description: "Business casual", other: "Customizable" }
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
          details: { area: "25000 sq ft", machines: "45", capacity: "50000 pcs/month", workforce: "120" },
          tagged_categories: ["Apparel"]
        },
        {
          name: "Warehouse 1",
          details: { area: "10000 sq ft", machines: "0", capacity: "Storage", workforce: "10" },
          tagged_categories: ["Apparel", "Accessories"]
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
            <X size={20} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }} onClick={() => setShowImportModal(false)} />
          </div>
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Example Format</label>
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
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>Paste JSON Here</label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your JSON..."
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
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: 4 }}>
            Business Profile
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            Manage your company details, products, infrastructure & compliance
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '10px 20px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(96,165,250,0.15)',
              border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: 8,
              color: '#60a5fa',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '10px 20px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Upload size={14} />
            Import JSON
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1400, margin: '0 auto' }}>

          {/* Section 1: Basic Details */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(96,165,250,0.05) 0%, rgba(13,31,60,0.6) 100%)',
            border: '1px solid rgba(96,165,250,0.2)',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Building2 size={20} color="#60a5fa" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa' }}>1. Basic Details</h3>
              </div>
              <button
                onClick={() => setEditingSection('basic-details')}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(96,165,250,0.15)',
                  border: '1px solid rgba(96,165,250,0.3)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#60a5fa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Edit3 size={14} />
                Edit
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {basicDetails.company_name ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  <InfoItem label="Company" value={basicDetails.company_name} />
                  <InfoItem label="GST" value={basicDetails.gst_number} />
                  <InfoItem label="City" value={basicDetails.city} />
                  <InfoItem label="State" value={basicDetails.state} />
                  {basicDetails.phone && <InfoItem label="Phone" value={basicDetails.phone} />}
                  {basicDetails.email && <InfoItem label="Email" value={basicDetails.email} />}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
                  No details yet. Click Edit to add company information.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Product Categories */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(13,31,60,0.6) 100%)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Package size={20} color="#10b981" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>2. Product Categories</h3>
              </div>
              <button
                onClick={() => {
                  setEditingSection('add-category')
                  setEditingItem(null)
                }}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#10b981',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={14} />
                Add Category
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {productCategories.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
                  {productCategories.map((cat, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: 12,
                      padding: 16,
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Tag size={16} color="#10b981" />
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{cat.name}</h4>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => {
                              setEditingSection('edit-category')
                              setEditingItem({ data: cat, index: idx })
                            }}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(96,165,250,0.15)',
                              border: '1px solid rgba(96,165,250,0.3)',
                              borderRadius: 6,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={12} color="#60a5fa" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(idx)}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(239,68,68,0.15)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: 6,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                      {cat.products && cat.products.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {cat.products.map((prod, pidx) => (
                            <div key={pidx} style={{
                              padding: '10px 12px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 8,
                              fontSize: 12
                            }}>
                              <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>{prod.name}</div>
                              {prod.description && (
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{prod.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                          No products in this category
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
                  No categories yet. Click "Add Category" to create your first product category.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Infrastructure */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(13,31,60,0.6) 100%)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Factory size={20} color="#f59e0b" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>3. Infrastructure</h3>
              </div>
              <button
                onClick={() => {
                  setEditingSection('add-infrastructure')
                  setEditingItem(null)
                }}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#f59e0b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={14} />
                Add Infrastructure
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {infrastructureItems.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
                  {infrastructureItems.map((item, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 12,
                      padding: 16
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{item.name}</h4>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => {
                              setEditingSection('edit-infrastructure')
                              setEditingItem({ data: item, index: idx })
                            }}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(96,165,250,0.15)',
                              border: '1px solid rgba(96,165,250,0.3)',
                              borderRadius: 6,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={12} color="#60a5fa" />
                          </button>
                          <button
                            onClick={() => handleDeleteInfrastructure(idx)}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(239,68,68,0.15)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: 6,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                        {item.details?.area && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Area:</span> {item.details.area}</div>}
                        {item.details?.machines && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Machines:</span> {item.details.machines}</div>}
                        {item.details?.capacity && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Capacity:</span> {item.details.capacity}</div>}
                        {item.details?.workforce && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Workforce:</span> {item.details.workforce}</div>}
                      </div>
                      {item.tagged_categories && item.tagged_categories.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {item.tagged_categories.map((tag, tidx) => (
                            <span key={tidx} style={{
                              padding: '4px 10px',
                              background: 'rgba(16,185,129,0.2)',
                              border: '1px solid rgba(16,185,129,0.4)',
                              borderRadius: 5,
                              fontSize: 10,
                              fontWeight: 600,
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
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
                  No infrastructure yet. Click "Add Infrastructure" to add factories, warehouses, etc.
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Compliance */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(13,31,60,0.6) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Award size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#8b5cf6' }}>4. Compliance & Certificates</h3>
              </div>
              <button
                onClick={() => setEditingSection('compliance')}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#8b5cf6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Edit3 size={14} />
                Edit
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {compliance.certifications && compliance.certifications.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {compliance.certifications.map((cert, i) => (
                    <div key={i} style={{
                      padding: '10px 16px',
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#c4b5fd',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <Check size={14} color="#8b5cf6" />
                      {cert}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
                  No certifications yet. Click Edit to add compliance information.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      {editingSection === 'basic-details' && <BasicDetailsEditor />}
      {(editingSection === 'add-category' || editingSection === 'edit-category') && (
        <CategoryEditor
          category={editingItem?.data}
          categoryIndex={editingItem?.index ?? null}
        />
      )}
      {(editingSection === 'add-infrastructure' || editingSection === 'edit-infrastructure') && (
        <InfrastructureEditor
          item={editingItem?.data}
          itemIndex={editingItem?.index ?? null}
        />
      )}
      {editingSection === 'compliance' && <ComplianceEditor />}
      {showImportModal && <ImportModal />}
    </div>
  )
}

// Helper component
const InfoItem = ({ label, value }) => (
  <div style={{
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8
  }}>
    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
    <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
      {value || '—'}
    </div>
  </div>
)
