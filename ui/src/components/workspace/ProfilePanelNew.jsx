import { useState, useEffect } from 'react'
import { getProfile, updateProfile, addProduct, updateProduct, deleteProduct } from '@/api/profile'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Save, Edit3, Building2, Package, MapPin, DollarSign, Plus, Trash2,
  Truck, Award, FileText, Info, Briefcase, Calendar, X, Check,
  Globe, Phone, Mail, CheckCircle, ShieldCheck, Tag
} from 'lucide-react'

export default function ProfilePanelNew() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(null) // null | 'company' | 'location' | 'about' | 'product-{index}'
  const [editData, setEditData] = useState({})
  const [showProductForm, setShowProductForm] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await getProfile()
      setProfile(res.data.profile || {})
    } catch (error) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSection = async (section, data) => {
    setSaving(true)
    try {
      const payload = { [section]: data }
      const res = await updateProfile(payload)
      setProfile(res.data.profile)
      setEditMode(null)
      setEditData({})
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAddProduct = async (product) => {
    setSaving(true)
    try {
      const res = await addProduct(product)
      setProfile(res.data.profile)
      setShowProductForm(false)
      toast.success('Product added successfully')
    } catch (error) {
      toast.error('Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProduct = async (index, product) => {
    setSaving(true)
    try {
      const res = await updateProduct(index, product)
      setProfile(res.data.profile)
      setEditMode(null)
      setEditData({})
      toast.success('Product updated successfully')
    } catch (error) {
      toast.error('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (index) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    setSaving(true)
    try {
      const res = await deleteProduct(index)
      setProfile(res.data.profile)
      toast.success('Product deleted')
    } catch (error) {
      toast.error('Failed to delete product')
    } finally {
      setSaving(false)
    }
  }

  const InfoCard = ({ icon: Icon, title, children, accent = '#60a5fa', onEdit, editable = true }) => (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      position: 'relative'
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
            <Icon size={20} color={accent} />
          </div>
          <h3 style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.01em'
          }}>
            {title}
          </h3>
        </div>
        {editable && onEdit && (
          <button
            onClick={onEdit}
            className="btn-ghost"
            style={{
              padding: '6px 12px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8
            }}
          >
            <Edit3 size={12} /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  )

  const InfoRow = ({ label, value, icon: Icon }) => {
    if (!value) return null

    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)'
      }}>
        {Icon && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(59,130,246,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2
          }}>
            <Icon size={14} color="#60a5fa" strokeWidth={2.5} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 4
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.6,
            fontWeight: 500,
            wordBreak: 'break-word'
          }}>
            {value}
          </div>
        </div>
      </div>
    )
  }

  const Badge = ({ children, color = '#60a5fa', onDelete }) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 12px',
      borderRadius: 8,
      background: `${color}15`,
      border: `1px solid ${color}30`,
      color: color,
      fontSize: 11,
      fontWeight: 600,
      marginRight: 8,
      marginBottom: 8
    }}>
      {children}
      {onDelete && (
        <button
          onClick={onDelete}
          style={{
            marginLeft: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'inherit'
          }}
        >
          <X size={12} />
        </button>
      )}
    </span>
  )

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
          outline: 'none'
        }}
      />
    </div>
  )

  const TextAreaField = ({ label, value, onChange, placeholder, rows = 4 }) => (
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
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.9)',
          fontSize: 13,
          padding: '10px 12px',
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.6
        }}
      />
    </div>
  )

  const TagInput = ({ label, values, onChange, placeholder }) => {
    const [inputValue, setInputValue] = useState('')

    const handleAdd = () => {
      if (inputValue.trim() && !values.includes(inputValue.trim())) {
        onChange([...values, inputValue.trim()])
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
            <Badge key={i} onDelete={() => handleRemove(i)}>
              {val}
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  const CompanyEditor = () => {
    const company = editData.company || {}

    return (
      <div>
        <InputField
          label="Trade Name"
          value={company.trade_name}
          onChange={(v) => setEditData({ company: { ...company, trade_name: v } })}
          placeholder="Your company's trade name"
        />
        <InputField
          label="Legal Name"
          value={company.legal_name}
          onChange={(v) => setEditData({ company: { ...company, legal_name: v } })}
          placeholder="Legal registered name"
        />
        <InputField
          label="Business Type"
          value={company.business_type}
          onChange={(v) => setEditData({ company: { ...company, business_type: v } })}
          placeholder="e.g., Manufacturer, Trader, Exporter"
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={() => setEditMode(null)} className="btn-ghost" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={() => handleUpdateSection('company', company)}
            disabled={saving}
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={14} /> : <Check size={14} />}
            Save
          </button>
        </div>
      </div>
    )
  }

  const LocationEditor = () => {
    const location = editData.location || {}

    return (
      <div>
        <InputField
          label="City"
          value={location.city}
          onChange={(v) => setEditData({ location: { ...location, city: v } })}
          placeholder="City name"
        />
        <InputField
          label="State"
          value={location.state}
          onChange={(v) => setEditData({ location: { ...location, state: v } })}
          placeholder="State name"
        />
        <TextAreaField
          label="Address"
          value={location.address}
          onChange={(v) => setEditData({ location: { ...location, address: v } })}
          placeholder="Full address"
          rows={3}
        />
        <InputField
          label="Pincode"
          value={location.pincode}
          onChange={(v) => setEditData({ location: { ...location, pincode: v } })}
          placeholder="6-digit pincode"
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={() => setEditMode(null)} className="btn-ghost" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={() => handleUpdateSection('location', location)}
            disabled={saving}
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={14} /> : <Check size={14} />}
            Save
          </button>
        </div>
      </div>
    )
  }

  const AboutEditor = () => {
    return (
      <div>
        <TextAreaField
          label="About Your Business"
          value={editData.about}
          onChange={(v) => setEditData({ about: v })}
          placeholder="Brief description of your business..."
          rows={6}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={() => setEditMode(null)} className="btn-ghost" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={() => handleUpdateSection('about', editData.about)}
            disabled={saving}
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={14} /> : <Check size={14} />}
            Save
          </button>
        </div>
      </div>
    )
  }

  const ProductForm = ({ product, index, onCancel }) => {
    const [formData, setFormData] = useState(product || {
      name: '',
      category: '',
      description: '',
      specifications: {
        fabric: { type: '', composition: '' },
        gsm: { value: '' },
        colors: [],
        sizes: []
      },
      pricing: { price_per_unit: '', moq: '', currency: 'INR' }
    })

    const handleSubmit = () => {
      if (index !== undefined) {
        handleUpdateProduct(index, formData)
      } else {
        handleAddProduct(formData)
      }
    }

    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
          {index !== undefined ? 'Edit Product' : 'Add New Product'}
        </h3>

        <InputField
          label="Product Name"
          value={formData.name}
          onChange={(v) => setFormData({ ...formData, name: v })}
          placeholder="e.g., Premium Cotton T-Shirt"
        />

        <InputField
          label="Category"
          value={formData.category}
          onChange={(v) => setFormData({ ...formData, category: v })}
          placeholder="e.g., T-Shirt, Polo, Hoodie"
        />

        <TextAreaField
          label="Description"
          value={formData.description}
          onChange={(v) => setFormData({ ...formData, description: v })}
          placeholder="Brief product description..."
          rows={3}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InputField
            label="Fabric Type"
            value={formData.specifications?.fabric?.type}
            onChange={(v) => setFormData({
              ...formData,
              specifications: {
                ...formData.specifications,
                fabric: { ...formData.specifications?.fabric, type: v }
              }
            })}
            placeholder="e.g., Cotton, Polyester"
          />

          <InputField
            label="GSM"
            value={formData.specifications?.gsm?.value}
            onChange={(v) => setFormData({
              ...formData,
              specifications: {
                ...formData.specifications,
                gsm: { value: v }
              }
            })}
            placeholder="e.g., 180"
            type="number"
          />
        </div>

        <TagInput
          label="Colors"
          values={formData.specifications?.colors || []}
          onChange={(v) => setFormData({
            ...formData,
            specifications: { ...formData.specifications, colors: v }
          })}
          placeholder="Add color"
        />

        <TagInput
          label="Sizes"
          values={formData.specifications?.sizes || []}
          onChange={(v) => setFormData({
            ...formData,
            specifications: { ...formData.specifications, sizes: v }
          })}
          placeholder="Add size (e.g., S, M, L)"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InputField
            label="Price Per Unit (INR)"
            value={formData.pricing?.price_per_unit}
            onChange={(v) => setFormData({
              ...formData,
              pricing: { ...formData.pricing, price_per_unit: parseFloat(v) || '' }
            })}
            placeholder="e.g., 150"
            type="number"
          />

          <InputField
            label="MOQ (Minimum Order Qty)"
            value={formData.pricing?.moq}
            onChange={(v) => setFormData({
              ...formData,
              pricing: { ...formData.pricing, moq: parseInt(v) || '' }
            })}
            placeholder="e.g., 100"
            type="number"
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={onCancel} className="btn-ghost" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.name}
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {saving ? <Spinner size={14} /> : <Check size={14} />}
            {index !== undefined ? 'Update' : 'Add'} Product
          </button>
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

  const company = profile?.company || {}
  const location = profile?.location || {}
  const about = profile?.about || ''
  const products = profile?.products || []

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a1628', overflow: 'hidden' }}>
      <div style={{
        padding: '24px 32px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(13,31,60,0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            Business Profile
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            AI agents read this before every negotiation — keep it accurate
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div className="fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* Hero Card - Company Header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(5,78,148,0.2) 0%, rgba(26,143,255,0.1) 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 20,
            padding: '32px',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #054E94, #1A8FFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                boxShadow: '0 8px 24px rgba(59,130,246,0.3)'
              }}>
                <Building2 size={32} color="white" strokeWidth={2} />
              </div>

              <h1 style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#fff',
                margin: 0,
                marginBottom: 8,
                letterSpacing: '-0.02em'
              }}>
                {company.trade_name || company.legal_name || 'Your Company Name'}
              </h1>

              {company.business_type && (
                <div style={{ marginBottom: 16 }}>
                  <Badge color="#10b981">
                    <Briefcase size={12} style={{ marginRight: 6 }} />
                    {company.business_type}
                  </Badge>
                </div>
              )}

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 20,
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                {company.gstin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={16} color="#10b981" />
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                        GSTIN
                      </div>
                      <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>
                        {company.gstin}
                      </div>
                    </div>
                  </div>
                )}
                {location.city && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={16} color="#60a5fa" />
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                        Location
                      </div>
                      <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                        {location.city}, {location.state}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Left Column */}
            <div>
              {/* Company Information */}
              <InfoCard
                icon={Building2}
                title="Company Information"
                accent="#60a5fa"
                onEdit={() => {
                  setEditData({ company })
                  setEditMode('company')
                }}
              >
                {editMode === 'company' ? (
                  <CompanyEditor />
                ) : (
                  <div style={{ marginTop: -8 }}>
                    <InfoRow label="Trade Name" value={company.trade_name} icon={Building2} />
                    <InfoRow label="Legal Name" value={company.legal_name} icon={FileText} />
                    <InfoRow label="GSTIN" value={company.gstin} icon={ShieldCheck} />
                    <InfoRow label="Business Type" value={company.business_type} icon={Briefcase} />
                  </div>
                )}
              </InfoCard>

              {/* About */}
              <InfoCard
                icon={Info}
                title="About Business"
                accent="#8b5cf6"
                onEdit={() => {
                  setEditData({ about })
                  setEditMode('about')
                }}
              >
                {editMode === 'about' ? (
                  <AboutEditor />
                ) : (
                  <p style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.8,
                    margin: 0
                  }}>
                    {about || 'No description provided'}
                  </p>
                )}
              </InfoCard>
            </div>

            {/* Right Column */}
            <div>
              {/* Location & Address */}
              <InfoCard
                icon={MapPin}
                title="Location & Address"
                accent="#f59e0b"
                onEdit={() => {
                  setEditData({ location })
                  setEditMode('location')
                }}
              >
                {editMode === 'location' ? (
                  <LocationEditor />
                ) : (
                  <div style={{ marginTop: -8 }}>
                    <InfoRow label="City" value={location.city} icon={MapPin} />
                    <InfoRow label="State" value={location.state} icon={Globe} />
                    <InfoRow label="Address" value={location.address} />
                    <InfoRow label="Pincode" value={location.pincode} />
                  </div>
                )}
              </InfoCard>
            </div>
          </div>

          {/* Products Section */}
          <InfoCard
            icon={Package}
            title="Products & Catalog"
            accent="#ec4899"
            editable={false}
          >
            {showProductForm ? (
              <ProductForm onCancel={() => setShowProductForm(false)} />
            ) : editMode?.startsWith('product-') ? (
              <ProductForm
                product={products[parseInt(editMode.split('-')[1])]}
                index={parseInt(editMode.split('-')[1])}
                onCancel={() => setEditMode(null)}
              />
            ) : (
              <>
                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Package size={32} color="#ec4899" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                      No products added yet
                    </p>
                    <button
                      onClick={() => setShowProductForm(true)}
                      className="btn-primary"
                      style={{
                        width: 'auto',
                        padding: '10px 24px',
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <Plus size={14} /> Add Your First Product
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <button
                        onClick={() => setShowProductForm(true)}
                        className="btn-primary"
                        style={{
                          width: 'auto',
                          padding: '8px 16px',
                          fontSize: 11,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Plus size={12} /> Add Product
                      </button>
                    </div>

                    {products.map((product, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                            {product.name}
                          </h4>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => setEditMode(`product-${idx}`)}
                              className="btn-ghost"
                              style={{ padding: '4px 10px', fontSize: 11 }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(idx)}
                              className="btn-ghost"
                              style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {product.category && (
                          <Badge color="#ec4899">
                            <Tag size={10} style={{ marginRight: 4 }} />
                            {product.category}
                          </Badge>
                        )}

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                          marginTop: 12,
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.5)'
                        }}>
                          {product.pricing?.price_per_unit && (
                            <div>
                              <DollarSign size={10} style={{ display: 'inline', marginRight: 4 }} />
                              ₹{product.pricing.price_per_unit}/piece
                            </div>
                          )}
                          {product.pricing?.moq && (
                            <div>MOQ: {product.pricing.moq}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </InfoCard>

        </div>
      </div>
    </div>
  )
}
