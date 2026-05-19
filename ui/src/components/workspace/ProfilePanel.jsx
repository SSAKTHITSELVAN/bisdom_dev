import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Save, Edit3, Building2, Package, MapPin, DollarSign,
  Truck, Award, FileText, Info, Briefcase, Calendar,
  Globe, Phone, Mail, CheckCircle, ShieldCheck
} from 'lucide-react'

export default function ProfilePanel() {
  const [profileMd, setProfileMd] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = () => {
    getConfig()
      .then(r => { setProfileMd(r.data.profile_md); setDraft(r.data.profile_md) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateConfig({ profile_md: draft })
      setProfileMd(draft)
      setEditMode(false)
      toast.success('Profile saved — AI agents will use this in next negotiation')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  // Parse markdown into structured data
  const parseProfile = (text) => {
    if (!text) return null

    // Remove markdown formatting (* ** etc)
    const cleanText = (str) => str.replace(/\*\*/g, '').replace(/\*/g, '').trim()

    const data = {
      company: {},
      location: {},
      business: {},
      products: [],
      certifications: []
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l)

    for (let i = 0; i < lines.length; i++) {
      const line = cleanText(lines[i])

      // Skip headers
      if (line.startsWith('#')) continue

      // Look for key-value patterns
      const patterns = [
        { regex: /Trade Name[:\s]+(.+)/i, key: 'tradeName' },
        { regex: /Legal Name[:\s]+(.+)/i, key: 'legalName' },
        { regex: /GSTIN[:\s]+([A-Z0-9]+)/i, key: 'gstin' },
        { regex: /GST.*Status[:\s]*(.+)/i, key: 'gstStatus' },
        { regex: /Business Type[:\s]+(.+)/i, key: 'businessType' },
        { regex: /GST Registered[:\s]+(.+)/i, key: 'gstRegistered' },
        { regex: /Location[:\s]+(.+)/i, key: 'location' },
        { regex: /Address[:\s]+(.+)/i, key: 'address' },
        { regex: /City[:\s]+(.+)/i, key: 'city' },
        { regex: /State[:\s]+(.+)/i, key: 'state' },
        { regex: /Pincode[:\s]+(.+)/i, key: 'pincode' },
        { regex: /Nature of Business[:\s]+(.+)/i, key: 'natureOfBusiness' },
        { regex: /Email[:\s]+(.+)/i, key: 'email' },
        { regex: /Phone[:\s]+(.+)/i, key: 'phone' },
        { regex: /Website[:\s]+(.+)/i, key: 'website' },
      ]

      for (const pattern of patterns) {
        const match = line.match(pattern.regex)
        if (match) {
          const value = match[1].trim()

          // Categorize
          if (['location', 'address', 'city', 'state', 'pincode'].includes(pattern.key)) {
            data.location[pattern.key] = value
          } else if (['businessType', 'natureOfBusiness', 'gstRegistered'].includes(pattern.key)) {
            data.business[pattern.key] = value
          } else {
            data.company[pattern.key] = value
          }
          break
        }
      }

      // Extract products (look for product-related keywords)
      if (line.match(/product|item|category/i) && line.includes(':')) {
        const parts = line.split(':')
        if (parts.length >= 2) {
          data.products.push(parts[1].trim())
        }
      }
    }

    return data
  }

  const renderModernProfile = () => {
    const parsed = parseProfile(profileMd)
    if (!parsed) return null

    const InfoCard = ({ icon: Icon, title, children, accent = '#60a5fa' }) => (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
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

    const Badge = ({ children, color = '#60a5fa' }) => (
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
      </span>
    )

    const company = parsed.company
    const location = parsed.location
    const business = parsed.business

    return (
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
          {/* Background decoration */}
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
            {/* Company Logo/Icon */}
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

            {/* Company Name */}
            <h1 style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              marginBottom: 8,
              letterSpacing: '-0.02em'
            }}>
              {company.tradeName || company.legalName || 'Company Name'}
            </h1>

            {/* Business Type Badge */}
            {business.businessType && (
              <div style={{ marginBottom: 16 }}>
                <Badge color="#10b981">
                  <Briefcase size={12} style={{ marginRight: 6 }} />
                  {business.businessType}
                </Badge>
              </div>
            )}

            {/* Quick Info Row */}
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
              {location.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} color="#60a5fa" />
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                      Location
                    </div>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                      {location.location}
                    </div>
                  </div>
                </div>
              )}
              {business.gstRegistered && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={16} color="#f59e0b" />
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                      Registered Since
                    </div>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                      {business.gstRegistered}
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
            {(company.legalName || company.tradeName || company.gstStatus) && (
              <InfoCard icon={Building2} title="Company Information" accent="#60a5fa">
                <div style={{ marginTop: -8 }}>
                  {company.tradeName && (
                    <InfoRow label="Trade Name" value={company.tradeName} icon={Building2} />
                  )}
                  {company.legalName && company.legalName !== company.tradeName && (
                    <InfoRow label="Legal Name" value={company.legalName} icon={FileText} />
                  )}
                  {company.gstin && (
                    <InfoRow
                      label="GSTIN"
                      value={
                        <span>
                          {company.gstin}
                          {company.gstStatus && (
                            <span style={{
                              marginLeft: 8,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: company.gstStatus.toLowerCase().includes('active')
                                ? 'rgba(16,185,129,0.15)'
                                : 'rgba(239,68,68,0.15)',
                              color: company.gstStatus.toLowerCase().includes('active')
                                ? '#10b981'
                                : '#ef4444',
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}>
                              {company.gstStatus}
                            </span>
                          )}
                        </span>
                      }
                      icon={ShieldCheck}
                    />
                  )}
                </div>
              </InfoCard>
            )}

            {/* Business Details */}
            {(business.businessType || business.natureOfBusiness || business.gstRegistered) && (
              <InfoCard icon={Briefcase} title="Business Details" accent="#10b981">
                <div style={{ marginTop: -8 }}>
                  {business.businessType && (
                    <InfoRow label="Business Type" value={business.businessType} icon={Briefcase} />
                  )}
                  {business.gstRegistered && (
                    <InfoRow label="GST Registered" value={business.gstRegistered} icon={Calendar} />
                  )}
                  {business.natureOfBusiness && (
                    <InfoRow
                      label="Nature of Business"
                      value={
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {business.natureOfBusiness.split(',').map((item, i) => (
                            <Badge key={i} color="#10b981">
                              {item.trim()}
                            </Badge>
                          ))}
                        </div>
                      }
                    />
                  )}
                </div>
              </InfoCard>
            )}
          </div>

          {/* Right Column */}
          <div>
            {/* Location & Address */}
            {(location.address || location.location || location.city || location.state) && (
              <InfoCard icon={MapPin} title="Location & Address" accent="#f59e0b">
                <div style={{ marginTop: -8 }}>
                  {location.location && (
                    <InfoRow label="Location" value={location.location} icon={MapPin} />
                  )}
                  {location.address && (
                    <InfoRow label="Full Address" value={location.address} icon={Globe} />
                  )}
                  {location.city && (
                    <InfoRow label="City" value={location.city} />
                  )}
                  {location.state && (
                    <InfoRow label="State" value={location.state} />
                  )}
                  {location.pincode && (
                    <InfoRow label="Pincode" value={location.pincode} />
                  )}
                </div>
              </InfoCard>
            )}

            {/* Contact Information */}
            {(company.email || company.phone || company.website) && (
              <InfoCard icon={Phone} title="Contact Information" accent="#8b5cf6">
                <div style={{ marginTop: -8 }}>
                  {company.phone && (
                    <InfoRow label="Phone" value={company.phone} icon={Phone} />
                  )}
                  {company.email && (
                    <InfoRow label="Email" value={company.email} icon={Mail} />
                  )}
                  {company.website && (
                    <InfoRow label="Website" value={company.website} icon={Globe} />
                  )}
                </div>
              </InfoCard>
            )}
          </div>
        </div>

        {/* Full Width - Products/Categories (if any) */}
        {parsed.products.length > 0 && (
          <InfoCard icon={Package} title="Product Categories" accent="#ec4899">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {parsed.products.map((product, i) => (
                <Badge key={i} color="#ec4899">
                  <Package size={12} style={{ marginRight: 6 }} />
                  {product}
                </Badge>
              ))}
            </div>
          </InfoCard>
        )}

      </div>
    )
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1628', overflow:'hidden' }}>
      <div style={{
        padding:'24px 32px 20px',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        background: 'rgba(13,31,60,0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing: '-0.01em' }}>
            Business Profile
          </h2>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:4 }}>
            AI agents read this before every negotiation — keep it accurate
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {editMode ? (
            <>
              <button
                onClick={() => { setEditMode(false); setDraft(profileMd) }}
                className="btn-ghost"
                style={{ fontSize:12, padding:'9px 18px', borderRadius: 10 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                style={{
                  width:'auto',
                  fontSize:12,
                  padding:'9px 20px',
                  display:'flex',
                  alignItems:'center',
                  gap:8,
                  borderRadius: 10
                }}
              >
                {saving ? <Spinner size={14}/> : <Save size={14}/>}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="btn-ghost"
              style={{
                fontSize:12,
                padding:'9px 18px',
                display:'flex',
                alignItems:'center',
                gap:8,
                borderRadius: 10
              }}
            >
              <Edit3 size={14}/> Edit Profile
            </button>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'32px' }}>
        {loading && (
          <div style={{ display:'flex', justifyContent:'center', alignItems: 'center', minHeight: 400 }}>
            <Spinner size={32} color="rgba(255,255,255,0.3)"/>
          </div>
        )}

        {!loading && (
          <div>
            {editMode ? (
              <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <div style={{
                  fontSize:12,
                  color:'rgba(255,255,255,0.5)',
                  marginBottom:12,
                  display:'flex',
                  alignItems:'center',
                  gap:8,
                  padding: '12px 16px',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 12
                }}>
                  <Edit3 size={14}/>
                  <span>Editing profile — supports Markdown formatting</span>
                </div>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  style={{
                    width:'100%',
                    minHeight:600,
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:16,
                    color:'rgba(255,255,255,0.9)',
                    fontSize:13,
                    fontFamily:'JetBrains Mono, Consolas, monospace',
                    lineHeight:1.8,
                    padding:'20px',
                    outline:'none',
                    resize:'vertical'
                  }}
                  placeholder="Enter your business profile information here..."
                />
                <p style={{
                  fontSize:11,
                  color:'rgba(255,255,255,0.3)',
                  marginTop:12,
                  padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  💡 This text is passed to both your Buyer AI and Seller AI as company context during negotiations.
                </p>
              </div>
            ) : (
              <>
                {profileMd
                  ? renderModernProfile()
                  : <div style={{
                      textAlign:'center',
                      padding:'80px 20px',
                      maxWidth: 500,
                      margin: '0 auto'
                    }}>
                      <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: 20,
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px'
                      }}>
                        <Building2 size={36} color="#60a5fa" />
                      </div>
                      <h3 style={{
                        color:'#fff',
                        fontSize:18,
                        fontWeight: 700,
                        marginBottom: 8
                      }}>
                        No Profile Yet
                      </h3>
                      <p style={{
                        color:'rgba(255,255,255,0.4)',
                        fontSize:13,
                        lineHeight: 1.6,
                        marginBottom: 24
                      }}>
                        Create your business profile to help AI agents represent you better in negotiations.
                      </p>
                      <button
                        onClick={() => setEditMode(true)}
                        className="btn-primary"
                        style={{
                          width:'auto',
                          padding:'12px 32px',
                          fontSize: 13,
                          borderRadius: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10
                        }}
                      >
                        <Edit3 size={16} />
                        Create Profile
                      </button>
                    </div>
                }
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
