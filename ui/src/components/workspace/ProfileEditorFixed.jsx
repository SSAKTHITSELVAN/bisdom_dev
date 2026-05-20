import { useState, useEffect } from 'react'
import { getProfile, updateProfile } from '@/api/profile'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Save, Edit3, Building2, Package, MapPin, Plus, Trash2, X, Check,
  DollarSign, Ruler, Palette, Users, Award, ShoppingBag, AlertCircle, Upload
} from 'lucide-react'

export default function ProfileEditorFixed() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState(null)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await getProfile()
      let profileData = res.data.profile || {}

      // Auto-convert old format to new format if needed
      if (!profileData.supplier && profileData.company) {
        profileData = convertOldToNew(profileData)
      }

      // Initialize empty structure if completely empty
      if (!profileData.supplier && !profileData.company) {
        profileData = {
          supplier: {
            name: '',
            location: '',
            business_type: '',
            legal_status: '',
            since: '',
            annual_turnover: '',
            team_size: '',
            gst_registration: '',
            hsn_codes: []
          },
          catalogue: []
        }
      }

      setProfile(profileData)
    } catch (error) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const convertOldToNew = (oldProfile) => {
    const company = oldProfile.company || {}
    const location = oldProfile.location || {}
    const products = oldProfile.products || []

    return {
      supplier: {
        name: company.trade_name || company.legal_name || '',
        location: `${location.city || ''}, ${location.state || ''}`.trim(),
        business_type: company.business_type || '',
        legal_status: '',
        since: '',
        annual_turnover: '',
        team_size: '',
        gst_registration: company.registration_date || '',
        hsn_codes: []
      },
      catalogue: products.map(p => ({
        collection: p.category || '',
        product_name: p.name || '',
        product_url: p.url || '',
        price_per_piece: p.pricing?.price_per_unit || '',
        currency: 'INR',
        moq: p.pricing?.moq || '',
        moq_unit: 'Pieces',
        fabric: p.specifications?.fabric?.type || '',
        gsm: p.specifications?.gsm?.value || '',
        fit_type: p.specifications?.fit || '',
        neck_type: p.specifications?.neck_type || '',
        sleeve_type: p.specifications?.sleeve_type || '',
        pattern: '',
        print_type: p.specifications?.printing_methods || [],
        color: '',
        available_sizes: p.specifications?.sizes || [],
        use_case: p.use_cases || [],
        wash_care: '',
        fabric_treatment: p.specifications?.fabric?.treatment || '',
        country_of_origin: 'India',
        customization_available: false,
        confidence_flag: 'ok',
        needs_confirmation: false
      }))
    }
  }

  const handleUpdateSupplier = async (data) => {
    setSaving(true)
    try {
      const updatedProfile = { ...profile, supplier: data }
      const res = await updateProfile(updatedProfile)
      setProfile(res.data.profile)
      setEditingSection(null)
      toast.success('Supplier info updated')
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCatalogItem = async (item) => {
    setSaving(true)
    try {
      const currentCatalog = profile?.catalogue || []
      const updatedProfile = { ...profile, catalogue: [...currentCatalog, item] }
      const res = await updateProfile(updatedProfile)
      setProfile(res.data.profile)
      setEditingSection(null)
      toast.success('Product added to catalog')
    } catch (error) {
      toast.error('Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCatalogItem = async (index, item) => {
    setSaving(true)
    try {
      const currentCatalog = [...(profile?.catalogue || [])]
      currentCatalog[index] = item
      const updatedProfile = { ...profile, catalogue: currentCatalog }
      const res = await updateProfile(updatedProfile)
      setProfile(res.data.profile)
      setEditingSection(null)
      toast.success('Product updated')
    } catch (error) {
      toast.error('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCatalogItem = async (index) => {
    if (!confirm('Delete this product from catalog?')) return

    setSaving(true)
    try {
      const currentCatalog = profile?.catalogue || []
      const newCatalog = currentCatalog.filter((_, i) => i !== index)
      const updatedProfile = { ...profile, catalogue: newCatalog }
      const res = await updateProfile(updatedProfile)
      setProfile(res.data.profile)
      toast.success('Product removed')
    } catch (error) {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

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

  // Supplier Info Editor Modal
  const SupplierEditor = () => {
    const supplier = formData.supplier || profile?.supplier || {}

    const updateField = (field, value) => {
      setFormData({
        supplier: { ...supplier, [field]: value }
      })
    }

    return (
      <Modal
        title="✏️ Edit Supplier Information"
        onClose={() => setEditingSection(null)}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <InputField
            label="Business Name *"
            value={supplier.name}
            onChange={(v) => updateField('name', v)}
            placeholder="Your company name"
          />
          <InputField
            label="Location *"
            value={supplier.location}
            onChange={(v) => updateField('location', v)}
            placeholder="City, State, Country"
          />
          <InputField
            label="Business Type"
            value={supplier.business_type}
            onChange={(v) => updateField('business_type', v)}
            placeholder="e.g., Manufacturer, Trader"
          />
          <InputField
            label="Legal Status"
            value={supplier.legal_status}
            onChange={(v) => updateField('legal_status', v)}
            placeholder="e.g., Proprietorship, Pvt Ltd"
          />
          <InputField
            label="Established Year"
            value={supplier.since}
            onChange={(v) => updateField('since', v)}
            placeholder="2020"
          />
          <InputField
            label="Annual Turnover"
            value={supplier.annual_turnover}
            onChange={(v) => updateField('annual_turnover', v)}
            placeholder="e.g., 1Cr - 5Cr"
          />
          <InputField
            label="Team Size"
            value={supplier.team_size}
            onChange={(v) => updateField('team_size', v)}
            placeholder="e.g., 26-50"
          />
          <InputField
            label="GST Registration Date"
            value={supplier.gst_registration}
            onChange={(v) => updateField('gst_registration', v)}
            placeholder="e.g., Oct 2022"
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <TagInput
            label="HSN Codes"
            values={supplier.hsn_codes || []}
            onChange={(v) => updateField('hsn_codes', v)}
            placeholder="Add HSN code (e.g., 6109)"
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={() => setEditingSection(null)}
            className="btn-ghost"
            style={{ flex: 1, padding: '12px 24px' }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleUpdateSupplier(formData.supplier)}
            disabled={saving}
            className="btn-primary"
            style={{ flex: 1, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={16} /> : <Check size={16} />}
            Save Supplier Info
          </button>
        </div>
      </Modal>
    )
  }

  // Catalog Item Editor Modal
  const CatalogItemEditor = ({ index }) => {
    const isEdit = index !== undefined
    const item = isEdit ? (profile?.catalogue || [])[index] : {}

    const [catalogData, setCatalogData] = useState(item || {
      collection: '',
      product_name: '',
      product_url: '',
      price_per_piece: '',
      currency: 'INR',
      moq: '',
      moq_unit: 'Pieces',
      fabric: '',
      gsm: '',
      fit_type: '',
      neck_type: '',
      sleeve_type: '',
      pattern: '',
      print_type: [],
      color: '',
      available_sizes: [],
      use_case: [],
      wash_care: '',
      fabric_treatment: '',
      country_of_origin: 'India',
      customization_available: false,
      confidence_flag: 'ok',
      needs_confirmation: false
    })

    const updateField = (field, value) => {
      setCatalogData({ ...catalogData, [field]: value })
    }

    const handleSubmit = () => {
      if (!catalogData.product_name) {
        toast.error('Product name is required')
        return
      }
      if (isEdit) {
        handleUpdateCatalogItem(index, catalogData)
      } else {
        handleAddCatalogItem(catalogData)
      }
    }

    return (
      <Modal
        title={isEdit ? '✏️ Edit Catalog Item' : '➕ Add New Product to Catalog'}
        onClose={() => setEditingSection(null)}
      >
        {/* Basic Info */}
        <SectionHeader icon={Package} title="Basic Information" color="#60a5fa" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <InputField
            label="Collection"
            value={catalogData.collection}
            onChange={(v) => updateField('collection', v)}
            placeholder="e.g., Mens T Shirt"
          />
          <InputField
            label="Product Name *"
            value={catalogData.product_name}
            onChange={(v) => updateField('product_name', v)}
            placeholder="e.g., Men Plain T Shirt"
          />
        </div>

        <InputField
          label="Product URL (IndiaMART, etc.)"
          value={catalogData.product_url}
          onChange={(v) => updateField('product_url', v)}
          placeholder="https://www.indiamart.com/..."
        />

        {/* Pricing */}
        <SectionHeader icon={DollarSign} title="Pricing & MOQ" color="#10b981" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
          <InputField
            label="Price per Piece"
            value={catalogData.price_per_piece}
            onChange={(v) => updateField('price_per_piece', v)}
            type="number"
            placeholder="150"
          />
          <InputField
            label="Currency"
            value={catalogData.currency}
            onChange={(v) => updateField('currency', v)}
            placeholder="INR"
          />
          <InputField
            label="MOQ"
            value={catalogData.moq}
            onChange={(v) => updateField('moq', v)}
            type="number"
            placeholder="50"
          />
          <InputField
            label="MOQ Unit"
            value={catalogData.moq_unit}
            onChange={(v) => updateField('moq_unit', v)}
            placeholder="Pieces"
          />
        </div>

        {/* Fabric */}
        <SectionHeader icon={Ruler} title="Fabric & Specifications" color="#f59e0b" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <InputField
            label="Fabric"
            value={catalogData.fabric}
            onChange={(v) => updateField('fabric', v)}
            placeholder="Cotton, Polyester"
          />
          <InputField
            label="GSM"
            value={catalogData.gsm}
            onChange={(v) => updateField('gsm', v)}
            placeholder="180-220"
          />
          <InputField
            label="Fit Type"
            value={catalogData.fit_type}
            onChange={(v) => updateField('fit_type', v)}
            placeholder="Regular Fit"
          />
          <InputField
            label="Neck Type"
            value={catalogData.neck_type}
            onChange={(v) => updateField('neck_type', v)}
            placeholder="Round Neck"
          />
          <InputField
            label="Sleeve Type"
            value={catalogData.sleeve_type}
            onChange={(v) => updateField('sleeve_type', v)}
            placeholder="Half Sleeve"
          />
          <InputField
            label="Pattern"
            value={catalogData.pattern}
            onChange={(v) => updateField('pattern', v)}
            placeholder="Solid, Printed"
          />
        </div>

        {/* Arrays */}
        <SectionHeader icon={Palette} title="Options & Features" color="#ec4899" />
        <TagInput
          label="Print Types"
          values={catalogData.print_type || []}
          onChange={(v) => updateField('print_type', v)}
          placeholder="Screen Printing, DTF, Embroidery"
        />
        <TagInput
          label="Available Sizes"
          values={catalogData.available_sizes || []}
          onChange={(v) => updateField('available_sizes', v)}
          placeholder="S, M, L, XL, XXL"
        />
        <TagInput
          label="Use Cases"
          values={catalogData.use_case || []}
          onChange={(v) => updateField('use_case', v)}
          placeholder="Casual Wear, Sports Wear"
        />

        {/* Additional */}
        <SectionHeader icon={Award} title="Additional Details" color="#8b5cf6" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <InputField
            label="Color"
            value={catalogData.color}
            onChange={(v) => updateField('color', v)}
            placeholder="Black, White"
          />
          <InputField
            label="Wash Care"
            value={catalogData.wash_care}
            onChange={(v) => updateField('wash_care', v)}
            placeholder="Machine Wash"
          />
          <InputField
            label="Fabric Treatment"
            value={catalogData.fabric_treatment}
            onChange={(v) => updateField('fabric_treatment', v)}
            placeholder="Bio Washed"
          />
        </div>

        {/* Checkboxes */}
        <div style={{ marginTop: 24, display: 'flex', gap: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={catalogData.customization_available}
              onChange={(e) => updateField('customization_available', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Customization Available
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={catalogData.needs_confirmation}
              onChange={(e) => updateField('needs_confirmation', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Needs Confirmation
          </label>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
          <button
            onClick={() => setEditingSection(null)}
            className="btn-ghost"
            style={{ flex: 1, padding: '14px 24px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !catalogData.product_name}
            className="btn-primary"
            style={{ flex: 1, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={16} /> : <Check size={16} />}
            {isEdit ? 'Update Product' : 'Add to Catalog'}
          </button>
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

  const SectionHeader = ({ icon: Icon, title, color }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 32,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: `2px solid ${color}30`
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={16} color={color} />
      </div>
      <h4 style={{ fontSize: 14, fontWeight: 700, color: color, margin: 0 }}>
        {title}
      </h4>
    </div>
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spinner size={32} color="rgba(255,255,255,0.3)" />
      </div>
    )
  }

  const supplier = profile?.supplier || {}
  const catalogue = profile?.catalogue || []

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a1628', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(13,31,60,0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
          Business Profile & Catalog
        </h2>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          Professional catalog management system for AI-powered negotiations
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Supplier Information */}
          <InfoCard
            icon={Building2}
            title="Supplier Information"
            accent="#60a5fa"
            onEdit={() => {
              setFormData({ supplier })
              setEditingSection('supplier')
            }}
          >
            {!supplier.name && !supplier.location ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
                <Building2 size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 13, marginBottom: 16 }}>No supplier information yet</p>
                <button
                  onClick={() => {
                    setFormData({ supplier })
                    setEditingSection('supplier')
                  }}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 24px', fontSize: 12 }}
                >
                  <Plus size={14} style={{ marginRight: 6 }} />
                  Add Supplier Info
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                  <InfoRow label="Business Name" value={supplier.name} />
                  <InfoRow label="Location" value={supplier.location} />
                  <InfoRow label="Business Type" value={supplier.business_type} />
                  <InfoRow label="Legal Status" value={supplier.legal_status} />
                  <InfoRow label="Established" value={supplier.since} />
                  <InfoRow label="Annual Turnover" value={supplier.annual_turnover} />
                  <InfoRow label="Team Size" value={supplier.team_size} />
                  <InfoRow label="GST Registration" value={supplier.gst_registration} />
                </div>
                {supplier.hsn_codes && supplier.hsn_codes.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>HSN Codes:</div>
                    {supplier.hsn_codes.map((code, i) => (
                      <Badge key={i} color="#10b981">{code}</Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </InfoCard>

          {/* Product Catalog */}
          <InfoCard
            icon={Package}
            title={`Product Catalog (${catalogue.length} ${catalogue.length === 1 ? 'item' : 'items'})`}
            accent="#ec4899"
          >
            <button
              onClick={() => setEditingSection('catalog-add')}
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
              <Plus size={14} /> Add Product to Catalog
            </button>

            {catalogue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
                <Package size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>No products in catalog yet</p>
                <p style={{ fontSize: 11, marginTop: 8 }}>Add your first product to start building your catalog</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {catalogue.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      padding: 20,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(96,165,250,0.3)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4 }}>
                          {item.product_name}
                        </h4>
                        {item.collection && (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            {item.collection}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setEditingSection(`catalog-edit-${idx}`)}
                          className="btn-ghost"
                          style={{ padding: '6px 12px', fontSize: 11 }}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCatalogItem(idx)}
                          className="btn-ghost"
                          style={{ padding: '6px 12px', fontSize: 11, color: '#ef4444' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                      {item.price_per_piece && (
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Price</div>
                          <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
                            {item.currency} {item.price_per_piece}/piece
                          </div>
                        </div>
                      )}
                      {item.moq && (
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>MOQ</div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                            {item.moq} {item.moq_unit}
                          </div>
                        </div>
                      )}
                      {item.fabric && (
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Fabric</div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                            {item.fabric}
                          </div>
                        </div>
                      )}
                      {item.gsm && (
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>GSM</div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                            {item.gsm}
                          </div>
                        </div>
                      )}
                    </div>

                    {(item.fit_type || item.neck_type || item.sleeve_type) && (
                      <div style={{ marginBottom: 12 }}>
                        {item.fit_type && <Badge color="#60a5fa">{item.fit_type}</Badge>}
                        {item.neck_type && <Badge color="#8b5cf6">{item.neck_type}</Badge>}
                        {item.sleeve_type && <Badge color="#f59e0b">{item.sleeve_type}</Badge>}
                      </div>
                    )}

                    {item.available_sizes && item.available_sizes.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginRight: 8 }}>Sizes:</span>
                        {item.available_sizes.map((size, i) => (
                          <Badge key={i} color="#ec4899">{size}</Badge>
                        ))}
                      </div>
                    )}

                    {item.needs_confirmation && (
                      <div style={{
                        marginTop: 12,
                        padding: '8px 12px',
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <AlertCircle size={14} color="#f59e0b" />
                        <span style={{ fontSize: 11, color: '#f59e0b' }}>
                          {item.validation_note || 'Needs confirmation'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </InfoCard>

        </div>
      </div>

      {/* Modals */}
      {editingSection === 'supplier' && <SupplierEditor />}
      {editingSection === 'catalog-add' && <CatalogItemEditor />}
      {editingSection?.startsWith('catalog-edit-') && (
        <CatalogItemEditor index={parseInt(editingSection.split('-')[2])} />
      )}
    </div>
  )
}

// Reusable Input Components
const InputField = ({ label, value, onChange, placeholder, type = 'text' }) => (
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
