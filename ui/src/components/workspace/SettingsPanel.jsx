import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { Save, Edit3, Bot, ShoppingCart } from 'lucide-react'

function SettingsEditor({ title, subtitle, icon: Icon, color, value, onChange, onSave, saving, editMode, setEditMode }) {
  const renderMd = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# '))  return <h1 key={i} style={{ fontSize:15, fontWeight:800, color:'#fff', margin:'12px 0 6px' }}>{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize:13, fontWeight:700, color, margin:'10px 0 4px', borderBottom:'1px solid rgba(255,255,255,0.07)', paddingBottom:3 }}>{line.slice(3)}</h2>
      if (line.startsWith('### '))return <h3 key={i} style={{ fontSize:12, fontWeight:700, color:'#cbd5e1', margin:'8px 0 3px' }}>{line.slice(4)}</h3>
      if (line.startsWith('- '))  return <div key={i} style={{ fontSize:12, color:'rgba(255,255,255,0.7)', padding:'2px 0 2px 10px', display:'flex', gap:6 }}><span style={{ color, flexShrink:0 }}>·</span>{line.slice(2)}</div>
      if (line.startsWith('<!--') || line.endsWith('-->')) return <div key={i} style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontStyle:'italic', padding:'2px 0' }}>{line}</div>
      if (line.startsWith('---')) return <hr key={i} style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.07)', margin:'10px 0' }}/>
      if (line.trim() === '')     return <div key={i} style={{ height:4 }}/>
      if (line.startsWith('*'))   return <p key={i} style={{ fontSize:10, color:'rgba(255,255,255,0.25)', fontStyle:'italic' }}>{line.replace(/\*/g,'')}</p>
      return <p key={i} style={{ fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>{line}</p>
    })
  }

  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={15} style={{ color }}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{title}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:1 }}>{subtitle}</div>
          </div>
        </div>
        {editMode
          ? <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setEditMode(false)} className="btn-ghost" style={{ fontSize:11, padding:'6px 12px' }}>Cancel</button>
              <button onClick={onSave} disabled={saving} className="btn-primary"
                style={{ width:'auto', fontSize:11, padding:'6px 14px', display:'flex', alignItems:'center', gap:5 }}>
                {saving ? <Spinner size={12}/> : <Save size={12}/>} Save
              </button>
            </div>
          : <button onClick={() => setEditMode(true)} className="btn-ghost"
              style={{ fontSize:11, padding:'6px 12px', display:'flex', alignItems:'center', gap:5 }}>
              <Edit3 size={12}/> Edit
            </button>
        }
      </div>

      {/* Content */}
      <div style={{ padding:'14px 18px' }}>
        {editMode ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              width:'100%', minHeight:340, background:'rgba(0,0,0,0.2)',
              border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
              color:'rgba(255,255,255,0.85)', fontSize:12, fontFamily:'monospace',
              lineHeight:1.7, padding:'14px', outline:'none', resize:'vertical'
            }}
          />
        ) : (
          <div style={{ maxHeight:320, overflowY:'auto' }}>{renderMd(value)}</div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPanel() {
  const [buyerMd, setBuyerMd]   = useState('')
  const [sellerMd, setSellerMd] = useState('')
  const [loading, setLoading]   = useState(true)
  const [editBuyer, setEditBuyer]   = useState(false)
  const [editSeller, setEditSeller] = useState(false)
  const [savingBuyer, setSavingBuyer]   = useState(false)
  const [savingSeller, setSavingSeller] = useState(false)
  const [draftBuyer, setDraftBuyer]   = useState('')
  const [draftSeller, setDraftSeller] = useState('')

  useEffect(() => {
    getConfig()
      .then(r => {
        setBuyerMd(r.data.buyer_settings_md);   setDraftBuyer(r.data.buyer_settings_md)
        setSellerMd(r.data.seller_settings_md); setDraftSeller(r.data.seller_settings_md)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const saveBuyer = async () => {
    setSavingBuyer(true)
    try {
      await updateConfig({ buyer_settings_md: draftBuyer })
      setBuyerMd(draftBuyer); setEditBuyer(false)
      toast.success('Buyer AI settings saved')
    } catch { toast.error('Save failed') }
    finally { setSavingBuyer(false) }
  }

  const saveSeller = async () => {
    setSavingSeller(true)
    try {
      await updateConfig({ seller_settings_md: draftSeller })
      setSellerMd(draftSeller); setEditSeller(false)
      toast.success('Seller AI settings saved')
    } catch { toast.error('Save failed') }
    finally { setSavingSeller(false) }
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1628', overflow:'hidden' }}>
      <div style={{ padding:'20px 28px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <h2 style={{ fontSize:16, fontWeight:800, color:'#fff' }}>AI Agent Settings</h2>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
          Configure how your Buyer AI and Seller AI negotiate — edit freely like a text file
        </p>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>
        {loading && <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={24} color="rgba(255,255,255,0.3)"/></div>}

        {!loading && (
          <div style={{ maxWidth:680 }} className="fade-in">
            <SettingsEditor
              title="Buyer AI Configuration"
              subtitle="How your AI negotiates when you're buying"
              icon={Bot} color="#60a5fa"
              value={draftBuyer} onChange={setDraftBuyer}
              onSave={saveBuyer} saving={savingBuyer}
              editMode={editBuyer} setEditMode={setEditBuyer}
            />
            <SettingsEditor
              title="Seller AI Configuration"
              subtitle="How your AI negotiates when you're selling — includes price floors"
              icon={ShoppingCart} color="#a78bfa"
              value={draftSeller} onChange={setDraftSeller}
              onSave={saveSeller} saving={savingSeller}
              editMode={editSeller} setEditMode={setEditSeller}
            />
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'center', marginTop:8 }}>
              Bisdom v1.0 · AI Commerce Engine · Both agents always read your profile + these settings
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
