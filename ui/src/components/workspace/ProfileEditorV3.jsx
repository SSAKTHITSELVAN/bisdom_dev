import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Save, Edit3, Building2, Package, MapPin, Plus, Trash2, X, Check,
  Factory, Award, Upload, FileText
} from 'lucide-react'

/**
 * Profile Structure V3 - 4 Sections
 *
 * 1. Basic Details - Company name, GST, address
 * 2. Products/Services - List of products
 * 3. Company Infrastructure - Square feet, machines, capacity
 * 4. Compliance/Certificates - ISO, GOTS, etc.
 */

export default function ProfileEditorV3() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState(null)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [jsonInput, setJsonInput] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await getConfig()
      let profileData = res.data.profile || {}

      // Initialize empty structure if needed
      if (!profileData.basic_details && !profileData.products && !profileData.infrastructure && !profileData.compliance) {
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
          products: [],
          infrastructure: {
            factory_area_sqft: '',
            number_of_machines: '',
            production_capacity: '',
            workforce_size: '',
            storage_capacity: '',
            other: []
          },
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

  // Section 1: Basic Details
  const handleUpdateBasicDetails = async (data) => {
    setSaving(true)
    try {
      const updatedProfile = { ...profile, basic_details: data }
      const res = await updateConfig({ profile: updatedProfile })
      setProfile(res.data.profile)
      setEditingSection(null)
      toast.success('Basic details updated')
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // Section 2: Products
  const handleAddProduct = async (item) => {
    setSaving(true)
    try {
      const currentProducts = profile?.products || []
      const updatedProfile = { ...profile, products: [...currentProducts, item] }
      const res = await updateConfig({ profile: updatedProfile })
      setProfile(res.data.profile)
      setEditingSection(null)
      toast.success('Product added')
    } catch (error) {
      toast.error('Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProduct = async (index, item) => {
    setSaving(true)
    try {
      const currentProducts = [...(profile?.products || [])]
      currentProducts[index] = item
      const updatedProfile = { ...profile, products: currentProducts }
      const res = await updateConfig({ profile: updatedProfile })
      setProfile(res.data.profile)
      setEditingSection(null)
      toast.success('Product updated')
    } catch (error) {
      toast.error('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (index) => {
    if (!confirm('Delete this product?')) return

    setSaving(true)
    try {
      const currentProducts = profile?.products || []
      const newProducts = currentProducts.filter((_, i) => i !== index)
      const updatedProfile = { ...profile, products: newProducts }
      const res = await updateConfig({ profile: updatedProfile })
      setProfile(res.data.profile)
      toast.success('Product removed')
    } catch (error) {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  // Section 3: Infrastructure
  const handleUpdateInfrastructure = async (data) => {
    setSaving(true)
    try {
      const updatedProfile = { ...profile, infrastructure: data }
      const res = await updateConfig({ profile: updatedProfile })
      setProfile(res.data.profile)
      setEditingSection(null)
      toast.success('Infrastructure details updated')
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
      const res = await updateConfig({ profile: updatedProfile })
      setProfile(res.data.profile)
      setEditingSection(null)
      toast.success('Compliance details updated')
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // Import JSON
  const handleImportJSON = async () => {
    try {
      const parsed = JSON.parse(jsonInput)

      // Validate structure
      if (!parsed.basic_details && !parsed.products && !parsed.infrastructure && !parsed.compliance) {
        toast.error('Invalid format! Must have at least one of: basic_details, products, infrastructure, compliance')
        return
      }

      setSaving(true)
      const res = await updateConfig({ profile: parsed })
      setProfile(res.data.profile)
      setShowImportModal(false)
      setJsonInput('')
      toast.success('Profile imported successfully!')
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format! Please check syntax')
      } else {
        toast.error('Failed to import profile')
      }
    } finally {
      setSaving(false)
    }
  }

  const exampleJSON = `{
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
}`

  // Modal Component
  const Modal = ({ children, onClose, title }) => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #0d1f3c 0%, #1a2840 100%)',
        borderRadius: 20,
        border: '1px solid rgba(96,165,250,0.2)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        maxWidth: 900,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(96,165,250,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(96,165,250,0.05)'
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)'
              e.target.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.05)'
              e.target.style.color = 'rgba(255,255,255,0.7)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: 32,
          overflowY: 'auto',
          flex: 1
        }}>
          {children}
        </div>
      </div>
    </div>
  )

  // Section 1 Editor: Basic Details
  const BasicDetailsEditor = () => {
    const [localData, setLocalData] = useState(formData.basic_details || {})

    const updateField = (field, value) => {
      setLocalData(prev => ({ ...prev, [field]: value }))
    }

    const updateOther = (values) => {
      setLocalData(prev => ({ ...prev, other: values }))
    }

    return (
      <Modal
        title="✏️ Edit Basic Details"
        onClose={() => setEditingSection(null)}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <InputField
            label="Company Name *"
            value={localData.company_name}
            onChange={(v) => updateField('company_name', v)}
            placeholder="Your company name"
          />
          <InputField
            label="GST Number *"
            value={localData.gst_number}
            onChange={(v) => updateField('gst_number', v)}
            placeholder="33XXXXX1234X1ZX"
          />
          <InputField
            label="Phone"
            value={localData.phone}
            onChange={(v) => updateField('phone', v)}
            placeholder="+91 9876543210"
          />
          <InputField
            label="Email"
            value={localData.email}
            onChange={(v) => updateField('email', v)}
            placeholder="contact@company.com"
          />
          <InputField
            label="Website"
            value={localData.website}
            onChange={(v) => updateField('website', v)}
            placeholder="https://company.com"
            fullWidth
          />
        </div>

        <SectionHeader title="Address" />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16 }}>
          <InputField
            label="Street Address"
            value={localData.address}
            onChange={(v) => updateField('address', v)}
            placeholder="123, Industrial Area"
          />
          <InputField
            label="City"
            value={localData.city}
            onChange={(v) => updateField('city', v)}
            placeholder="Tiruppur"
          />
          <InputField
            label="State"
            value={localData.state}
            onChange={(v) => updateField('state', v)}
            placeholder="Tamil Nadu"
          />
          <InputField
            label="Pincode"
            value={localData.pincode}
            onChange={(v) => updateField('pincode', v)}
            placeholder="641607"
          />
        </div>

        <SectionHeader title="Other Details" />
        <TagInput
          label="Additional Information"
          values={localData.other || []}
          onChange={updateOther}
          placeholder="e.g., Established: 2015, Annual Turnover: 5-10 Cr"
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={() => setEditingSection(null)}
            className="btn-ghost"
            style={{ flex: 1, padding: '12px 24px' }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleUpdateBasicDetails(localData)}
            disabled={saving}
            className="btn-primary"
            style={{ flex: 1, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={16} /> : <Check size={16} />}
            Save Basic Details
          </button>
        </div>
      </Modal>
    )
  }

  // Section 2 Editor: Product Item
  const ProductEditor = ({ index }) => {
    const isEdit = index !== undefined
    const item = isEdit ? (profile?.products || [])[index] : {}

    const [productData, setProductData] = useState(item || {
      name: '',
      category: '',
      description: '',
      other: ''
    })

    const updateField = (field, value) => {
      setProductData({ ...productData, [field]: value })
    }

    const handleSubmit = () => {
      if (!productData.name) {
        toast.error('Product name is required')
        return
      }
      if (isEdit) {
        handleUpdateProduct(index, productData)
      } else {
        handleAddProduct(productData)
      }
    }

    return (
      <Modal
        title={isEdit ? '✏️ Edit Product' : '➕ Add New Product'}
        onClose={() => setEditingSection(null)}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <InputField
            label="Product Name *"
            value={productData.name}
            onChange={(v) => updateField('name', v)}
            placeholder="e.g., T-Shirt"
          />
          <InputField
            label="Category"
            value={productData.category}
            onChange={(v) => updateField('category', v)}
            placeholder="e.g., Apparel"
          />
        </div>

        <InputField
          label="Description"
          value={productData.description}
          onChange={(v) => updateField('description', v)}
          placeholder="Brief description of the product"
        />

        <InputField
          label="Other Information"
          value={productData.other}
          onChange={(v) => updateField('other', v)}
          placeholder="Any additional details"
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={() => setEditingSection(null)}
            className="btn-ghost"
            style={{ flex: 1, padding: '12px 24px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !productData.name}
            className="btn-primary"
            style={{ flex: 1, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={16} /> : <Check size={16} />}
            {isEdit ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </Modal>
    )
  }

  // Section 3 Editor: Infrastructure
  const InfrastructureEditor = () => {
    const [localData, setLocalData] = useState(formData.infrastructure || {})

    const updateField = (field, value) => {
      setLocalData(prev => ({ ...prev, [field]: value }))
    }

    const updateOther = (values) => {
      setLocalData(prev => ({ ...prev, other: values }))
    }

    return (
      <Modal
        title="✏️ Edit Infrastructure Details"
        onClose={() => setEditingSection(null)}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <InputField
            label="Factory Area (sq ft)"
            value={localData.factory_area_sqft}
            onChange={(v) => updateField('factory_area_sqft', v)}
            placeholder="25000"
          />
          <InputField
            label="Number of Machines"
            value={localData.number_of_machines}
            onChange={(v) => updateField('number_of_machines', v)}
            placeholder="45"
          />
          <InputField
            label="Production Capacity"
            value={localData.production_capacity}
            onChange={(v) => updateField('production_capacity', v)}
            placeholder="50000 pieces/month"
          />
          <InputField
            label="Workforce Size"
            value={localData.workforce_size}
            onChange={(v) => updateField('workforce_size', v)}
            placeholder="120 employees"
          />
          <InputField
            label="Storage Capacity"
            value={localData.storage_capacity}
            onChange={(v) => updateField('storage_capacity', v)}
            placeholder="10000 sq ft"
            fullWidth
          />
        </div>

        <SectionHeader title="Other Infrastructure Details" />
        <TagInput
          label="Additional Information"
          values={localData.other || []}
          onChange={updateOther}
          placeholder="e.g., Backup power: 100 KVA, Quality control lab: Yes"
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={() => setEditingSection(null)}
            className="btn-ghost"
            style={{ flex: 1, padding: '12px 24px' }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleUpdateInfrastructure(localData)}
            disabled={saving}
            className="btn-primary"
            style={{ flex: 1, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={16} /> : <Check size={16} />}
            Save Infrastructure
          </button>
        </div>
      </Modal>
    )
  }

  // Section 4 Editor: Compliance
  const ComplianceEditor = () => {
    const [localData, setLocalData] = useState(formData.compliance || { certifications: [], other: [] })

    const updateCertifications = (values) => {
      setLocalData(prev => ({ ...prev, certifications: values }))
    }

    const updateOther = (values) => {
      setLocalData(prev => ({ ...prev, other: values }))
    }

    return (
      <Modal
        title="✏️ Edit Compliance & Certificates"
        onClose={() => setEditingSection(null)}
      >
        <TagInput
          label="Certifications"
          values={localData.certifications || []}
          onChange={updateCertifications}
          placeholder="e.g., ISO 9001:2015, GOTS, OEKO-TEX"
        />

        <SectionHeader title="Other Compliance Details" />
        <TagInput
          label="Additional Information"
          values={localData.other || []}
          onChange={updateOther}
          placeholder="e.g., Last audit: March 2024, Valid until: March 2026"
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            type="button"
            onClick={() => setEditingSection(null)}
            className="btn-ghost"
            style={{ flex: 1, padding: '12px 24px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleUpdateCompliance(localData)}
            disabled={saving}
            className="btn-primary"
            style={{ flex: 1, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={16} /> : <Check size={16} />}
            Save Compliance
          </button>
        </div>
      </Modal>
    )
  }

  // Import JSON Modal
  const ImportJSONModal = () => {
    const [showExample, setShowExample] = useState(false)

    return (
      <Modal
        title="📥 Import Profile from JSON"
        onClose={() => setShowImportModal(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
            Paste your complete profile JSON below with 4 sections: basic_details, products, infrastructure, compliance
          </p>

          <button
            onClick={() => setShowExample(!showExample)}
            className="btn-ghost"
            style={{ width: 'auto', padding: '6px 12px', fontSize: 11, marginBottom: 12 }}
          >
            {showExample ? '▼ Hide' : '▶'} Show Example Format
          </button>

          {showExample && (
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              maxHeight: 300,
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Example JSON Format:</span>
                <button
                  onClick={() => {
                    setJsonInput(exampleJSON)
                    toast.success('Example copied to input!')
                  }}
                  className="btn-ghost"
                  style={{ width: 'auto', padding: '4px 10px', fontSize: 10 }}
                >
                  Copy to Input
                </button>
              </div>
              <pre style={{
                fontSize: 11,
                color: '#a5f3fc',
                margin: 0,
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {exampleJSON}
              </pre>
            </div>
          )}
        </div>

        <label style={{
          display: 'block',
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 6,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Paste Your JSON Here
        </label>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"basic_details": {...}, "products": [...], "infrastructure": {...}, "compliance": {...}}'
          style={{
            width: '100%',
            minHeight: 400,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: '#a5f3fc',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            padding: '16px',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.6
          }}
          onFocus={(e) => e.target.style.borderColor = '#60a5fa'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={() => setShowImportModal(false)}
            className="btn-ghost"
            style={{ flex: 1, padding: '12px 24px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleImportJSON}
            disabled={saving || !jsonInput.trim()}
            className="btn-primary"
            style={{ flex: 1, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={16} /> : <Upload size={16} />}
            Import Profile
          </button>
        </div>

        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 8,
          fontSize: 11,
          color: 'rgba(255,255,255,0.6)'
        }}>
          ⚠️ <strong>Warning:</strong> Importing will replace your entire profile. Make sure to backup existing data if needed!
        </div>
      </Modal>
    )
  }

  // Display Components
  const InfoCard = ({ icon: Icon, title, children, onEdit, accent = '#60a5fa' }) => (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      transition: 'all 0.3s'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${accent}15`,
            border: `1px solid ${accent}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={20} color={accent} strokeWidth={2.5} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
            {title}
          </h3>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="btn-ghost"
            style={{ padding: '6px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Edit3 size={12} /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  )

  const InfoRow = ({ label, value }) => {
    if (!value && value !== 0) return null
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)'
      }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
          {value}
        </span>
      </div>
    )
  }

  const Badge = ({ children, color = '#60a5fa' }) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 6,
      background: `${color}15`,
      border: `1px solid ${color}30`,
      color: color,
      fontSize: 11,
      fontWeight: 600,
      marginRight: 8,
      marginBottom: 8
    }}>
      {children}
    </span>
  )

  const SectionHeader = ({ title }) => (
    <div style={{
      marginTop: 24,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: '2px solid rgba(96,165,250,0.2)',
      fontSize: 13,
      fontWeight: 700,
      color: '#60a5fa'
    }}>
      {title}
    </div>
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spinner size={32} color="rgba(255,255,255,0.3)" />
      </div>
    )
  }

  const basicDetails = profile?.basic_details || {}
  const products = profile?.products || []
  const infrastructure = profile?.infrastructure || {}
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
            Business Profile (4 Sections)
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            Basic Details • Products/Services • Infrastructure • Compliance
          </p>
        </div>
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
          Import from JSON
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Section 1: Basic Details */}
          <InfoCard
            icon={Building2}
            title="1. Basic Details"
            accent="#60a5fa"
            onEdit={() => {
              // Ensure basic_details has proper default values
              const basicDetailsData = basicDetails || {
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
              }
              setFormData({ basic_details: basicDetailsData })
              setEditingSection('basic-details')
            }}
          >
            {!basicDetails.company_name && !basicDetails.gst_number ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
                <Building2 size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 13, marginBottom: 16 }}>No basic details yet</p>
                <button
                  onClick={() => {
                    const basicDetailsData = basicDetails || {
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
                    }
                    setFormData({ basic_details: basicDetailsData })
                    setEditingSection('basic-details')
                  }}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 24px', fontSize: 12 }}
                >
                  <Plus size={14} style={{ marginRight: 6 }} />
                  Add Basic Details
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                  <InfoRow label="Company Name" value={basicDetails.company_name} />
                  <InfoRow label="GST Number" value={basicDetails.gst_number} />
                  <InfoRow label="Phone" value={basicDetails.phone} />
                  <InfoRow label="Email" value={basicDetails.email} />
                  <InfoRow label="Website" value={basicDetails.website} />
                  <InfoRow label="Address" value={basicDetails.address} />
                  <InfoRow label="City" value={basicDetails.city} />
                  <InfoRow label="State" value={basicDetails.state} />
                  <InfoRow label="Pincode" value={basicDetails.pincode} />
                </div>
                {basicDetails.other && basicDetails.other.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Other:</div>
                    {basicDetails.other.map((item, i) => (
                      <Badge key={i} color="#10b981">{item}</Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </InfoCard>

          {/* Section 2: Products/Services */}
          <InfoCard
            icon={Package}
            title={`2. Products/Services (${products.length} ${products.length === 1 ? 'item' : 'items'})`}
            accent="#ec4899"
          >
            <button
              onClick={() => setEditingSection('product-add')}
              className="btn-primary"
              style={{
                width: 'auto',
                padding: '10px 20px',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20
              }}
            >
              <Plus size={14} /> Add Product
            </button>

            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
                <Package size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>No products added yet</p>
                <p style={{ fontSize: 11, marginTop: 8 }}>Add products like T-Shirt, Polo, Hoodie</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {products.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      padding: 20,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4 }}>
                          {item.name}
                        </h4>
                        {item.category && (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setEditingSection(`product-edit-${idx}`)}
                          className="btn-ghost"
                          style={{ padding: '6px 12px', fontSize: 11 }}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(idx)}
                          className="btn-ghost"
                          style={{ padding: '6px 12px', fontSize: 11, color: '#ef4444' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {item.description && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                        {item.description}
                      </p>
                    )}

                    {item.other && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        <strong>Other:</strong> {item.other}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </InfoCard>

          {/* Section 3: Infrastructure */}
          <InfoCard
            icon={Factory}
            title="3. Company Infrastructure"
            accent="#f59e0b"
            onEdit={() => {
              // Ensure infrastructure has proper default values
              const infrastructureData = infrastructure || {
                factory_area_sqft: '',
                number_of_machines: '',
                production_capacity: '',
                workforce_size: '',
                storage_capacity: '',
                other: []
              }
              setFormData({ infrastructure: infrastructureData })
              setEditingSection('infrastructure')
            }}
          >
            {!infrastructure.factory_area_sqft && !infrastructure.number_of_machines ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
                <Factory size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 13, marginBottom: 16 }}>No infrastructure details yet</p>
                <button
                  onClick={() => {
                    const infrastructureData = infrastructure || {
                      factory_area_sqft: '',
                      number_of_machines: '',
                      production_capacity: '',
                      workforce_size: '',
                      storage_capacity: '',
                      other: []
                    }
                    setFormData({ infrastructure: infrastructureData })
                    setEditingSection('infrastructure')
                  }}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 24px', fontSize: 12 }}
                >
                  <Plus size={14} style={{ marginRight: 6 }} />
                  Add Infrastructure Details
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                  <InfoRow label="Factory Area" value={infrastructure.factory_area_sqft ? `${infrastructure.factory_area_sqft} sq ft` : null} />
                  <InfoRow label="Number of Machines" value={infrastructure.number_of_machines} />
                  <InfoRow label="Production Capacity" value={infrastructure.production_capacity} />
                  <InfoRow label="Workforce Size" value={infrastructure.workforce_size} />
                  <InfoRow label="Storage Capacity" value={infrastructure.storage_capacity} />
                </div>
                {infrastructure.other && infrastructure.other.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Other:</div>
                    {infrastructure.other.map((item, i) => (
                      <Badge key={i} color="#f59e0b">{item}</Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </InfoCard>

          {/* Section 4: Compliance */}
          <InfoCard
            icon={Award}
            title="4. Compliance & Certificates"
            accent="#8b5cf6"
            onEdit={() => {
              // Ensure compliance has proper default values
              const complianceData = compliance || { certifications: [], other: [] }
              setFormData({ compliance: complianceData })
              setEditingSection('compliance')
            }}
          >
            {!compliance.certifications || compliance.certifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
                <Award size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 13, marginBottom: 16 }}>No certifications yet</p>
                <button
                  onClick={() => {
                    const complianceData = { certifications: [], other: [] }
                    setFormData({ compliance: complianceData })
                    setEditingSection('compliance')
                  }}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 24px', fontSize: 12 }}
                >
                  <Plus size={14} style={{ marginRight: 6 }} />
                  Add Certifications
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Certifications:</div>
                  {(compliance.certifications || []).map((cert, i) => (
                    <Badge key={i} color="#8b5cf6">{cert}</Badge>
                  ))}
                </div>
                {compliance.other && compliance.other.length > 0 && (
                  <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Other:</div>
                    {(compliance.other || []).map((item, i) => (
                      <Badge key={i} color="#10b981">{item}</Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </InfoCard>

        </div>
      </div>

      {/* Modals */}
      {showImportModal && <ImportJSONModal />}
      {editingSection === 'basic-details' && <BasicDetailsEditor />}
      {editingSection === 'infrastructure' && <InfrastructureEditor />}
      {editingSection === 'compliance' && <ComplianceEditor />}
      {editingSection === 'product-add' && <ProductEditor />}
      {editingSection?.startsWith('product-edit-') && (
        <ProductEditor index={parseInt(editingSection.split('-')[2])} />
      )}
    </div>
  )
}

// Reusable Input Components
const InputField = ({ label, value, onChange, placeholder, type = 'text', fullWidth = false }) => (
  <div style={{ marginBottom: 16, gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
    <label style={{
      display: 'block',
      fontSize: 11,
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 6,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {label}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        padding: '10px 12px',
        outline: 'none',
        transition: 'all 0.2s'
      }}
      onFocus={(e) => e.target.style.borderColor = '#60a5fa'}
      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
    />
  </div>
)

const TagInput = ({ label, values, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
      setInputValue('')
    }
  }

  const handleRemove = (index) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block',
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 6,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.9)',
            fontSize: 13,
            padding: '10px 12px',
            outline: 'none'
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="btn-primary"
          style={{ width: 'auto', padding: '0 16px', fontSize: 12 }}
        >
          <Plus size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {values.map((val, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(96,165,250,0.15)',
              border: '1px solid rgba(96,165,250,0.3)',
              color: '#60a5fa',
              fontSize: 11,
              fontWeight: 600
            }}
          >
            {val}
            <button
              onClick={() => handleRemove(i)}
              style={{
                marginLeft: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'inherit',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
