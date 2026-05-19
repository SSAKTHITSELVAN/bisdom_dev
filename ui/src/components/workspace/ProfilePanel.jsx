import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { Save, Edit3, Building2, Package, MapPin, DollarSign, Truck, Award, FileText, Info } from 'lucide-react'

export default function ProfilePanel() {
  const [profileMd, setProfileMd] = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [editMode, setEditMode]   = useState(false)
  const [draft, setDraft]         = useState('')

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

  // Parse markdown and categorize into structured sections
  const parseProfile = (text) => {
    if (!text) return null

    const sections = {
      overview: {},
      catalog: [],
      contact: {},
      capabilities: {},
      misc: []
    }

    let currentSection = 'overview'
    let currentProduct = null
    const lines = text.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Section headers
      if (line.startsWith('# ')) {
        sections.title = line.slice(2).trim()
        continue
      }

      if (line.startsWith('## ')) {
        const header = line.slice(3).trim().toLowerCase()
        if (header.includes('overview') || header.includes('supplier overview')) {
          currentSection = 'overview'
        } else if (header.includes('catalogue') || header.includes('catalog') || header.includes('product')) {
          currentSection = 'catalog'
        } else if (header.includes('contact') || header.includes('location')) {
          currentSection = 'contact'
        } else if (header.includes('capabilities') || header.includes('capacity') || header.includes('certification')) {
          currentSection = 'capabilities'
        } else {
          currentSection = 'misc'
        }
        currentProduct = null
        continue
      }

      // Product items in catalog
      if (currentSection === 'catalog' && line.startsWith('### ') || line.startsWith('#### ')) {
        const productName = line.replace(/^#{3,4}\s*\d*\)\s*/, '').trim()
        currentProduct = { name: productName, details: {} }
        sections.catalog.push(currentProduct)
        continue
      }

      // Key-value pairs (bullet points)
      if (line.startsWith('- ')) {
        const content = line.slice(2).trim()
        const colonIdx = content.indexOf(':')

        if (colonIdx > 0) {
          const key = content.slice(0, colonIdx).trim()
          const value = content.slice(colonIdx + 1).trim()

          if (currentProduct && currentSection === 'catalog') {
            currentProduct.details[key] = value
          } else if (currentSection === 'overview') {
            sections.overview[key] = value
          } else if (currentSection === 'contact') {
            sections.contact[key] = value
          } else if (currentSection === 'capabilities') {
            sections.capabilities[key] = value
          } else if (currentSection === 'misc') {
            sections.misc.push({ key, value })
          }
        }
      }
    }

    return sections
  }

  const renderParsedProfile = () => {
    const parsed = parseProfile(profileMd)
    if (!parsed) return null

    const KeyValue = ({ label, value, icon: Icon }) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon size={14} color="#60a5fa" />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 3 }}>
            {label}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            {value}
          </div>
        </div>
      </div>
    )

    const Section = ({ title, icon: Icon, children }) => (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          {Icon && (
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon size={16} color="#60a5fa" />
            </div>
          )}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
            {title}
          </h3>
        </div>
        {children}
      </div>
    )

    const ProductCard = ({ product }) => (
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12
      }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 12 }}>
          {product.name}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {Object.entries(product.details).map(([key, value], i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                {key}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )

    return (
      <div className="fade-in" style={{ maxWidth: 900 }}>
        {parsed.title && (
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>
              {parsed.title}
            </h1>
          </div>
        )}

        {Object.keys(parsed.overview).length > 0 && (
          <Section title="Supplier Overview" icon={Building2}>
            {Object.entries(parsed.overview).map(([key, value], i) => (
              <KeyValue key={i} label={key} value={value} />
            ))}
          </Section>
        )}

        {Object.keys(parsed.contact).length > 0 && (
          <Section title="Contact Information" icon={MapPin}>
            {Object.entries(parsed.contact).map(([key, value], i) => (
              <KeyValue key={i} label={key} value={value} />
            ))}
          </Section>
        )}

        {Object.keys(parsed.capabilities).length > 0 && (
          <Section title="Capabilities & Certifications" icon={Award}>
            {Object.entries(parsed.capabilities).map(([key, value], i) => (
              <KeyValue key={i} label={key} value={value} />
            ))}
          </Section>
        )}

        {parsed.catalog.length > 0 && (
          <Section title="Product Catalogue" icon={Package}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
              {parsed.catalog.length} product{parsed.catalog.length !== 1 ? 's' : ''} listed
            </div>
            {parsed.catalog.map((product, i) => (
              <ProductCard key={i} product={product} />
            ))}
          </Section>
        )}

        {parsed.misc.length > 0 && (
          <Section title="Additional Information" icon={Info}>
            {parsed.misc.map((item, i) => (
              <KeyValue key={i} label={item.key} value={item.value} />
            ))}
          </Section>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1628', overflow:'hidden' }}>
      <div style={{ padding:'20px 28px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:16, fontWeight:800, color:'#fff' }}>Business Profile</h2>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
            AI agents read this before every negotiation — keep it accurate
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="btn-ghost" style={{ fontSize:11, padding:'7px 14px' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary"
                style={{ width:'auto', fontSize:11, padding:'7px 16px', display:'flex', alignItems:'center', gap:6 }}>
                {saving ? <Spinner size={13}/> : <Save size={13}/>} Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="btn-ghost"
              style={{ fontSize:11, padding:'7px 14px', display:'flex', alignItems:'center', gap:6 }}>
              <Edit3 size={13}/> Edit
            </button>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>
        {loading && <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={24} color="rgba(255,255,255,0.3)"/></div>}

        {!loading && (
          <div>
            {editMode ? (
              <div style={{ maxWidth: 900 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <Edit3 size={11}/> Editing profile — supports Markdown formatting
                </div>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  style={{
                    width:'100%', minHeight:500, background:'rgba(255,255,255,0.05)',
                    border:'1px solid rgba(255,255,255,0.12)', borderRadius:12,
                    color:'rgba(255,255,255,0.85)', fontSize:13, fontFamily:'monospace',
                    lineHeight:1.7, padding:'16px', outline:'none', resize:'vertical'
                  }}
                />
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:8 }}>
                  This text is passed verbatim to both your Buyer AI and Seller AI as company context.
                </p>
              </div>
            ) : (
              <>
                {profileMd
                  ? renderParsedProfile()
                  : <div style={{ textAlign:'center', padding:'48px 0' }}>
                      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>No profile yet.</p>
                      <p style={{ color:'rgba(255,255,255,0.2)', fontSize:11, marginTop:6 }}>
                        Edit your profile to add your business details manually.
                      </p>
                      <button onClick={() => setEditMode(true)} className="btn-primary" style={{ width:'auto', padding:'10px 24px', marginTop:16 }}>
                        + Write Profile
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
