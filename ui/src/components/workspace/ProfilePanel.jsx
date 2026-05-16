import { useState, useEffect } from 'react'
import { getConfig, updateConfig } from '@/api/config'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { Save, Edit3, Eye } from 'lucide-react'

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

  const renderMd = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# '))  return <h1 key={i} style={{ fontSize:18, fontWeight:800, color:'#fff', margin:'16px 0 8px' }}>{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize:14, fontWeight:700, color:'#93c5fd', margin:'14px 0 6px', borderBottom:'1px solid rgba(255,255,255,0.08)', paddingBottom:4 }}>{line.slice(3)}</h2>
      if (line.startsWith('### '))return <h3 key={i} style={{ fontSize:13, fontWeight:700, color:'#cbd5e1', margin:'10px 0 4px' }}>{line.slice(4)}</h3>
      if (line.startsWith('- '))  return <div key={i} style={{ fontSize:13, color:'rgba(255,255,255,0.75)', padding:'2px 0 2px 12px', display:'flex', gap:8 }}><span style={{color:'#60a5fa',flexShrink:0}}>·</span>{line.slice(2).replace(/\*\*(.*?)\*\*/g, (_,t) => t)}</div>
      if (line.startsWith('---')) return <hr key={i} style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.08)', margin:'12px 0' }}/>
      if (line.trim() === '')     return <div key={i} style={{ height:6 }}/>
      if (line.startsWith('*'))   return <p key={i} style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>{line.replace(/\*/g,'')}</p>
      return <p key={i} style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.6 }}>{line}</p>
    })
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
          <div style={{ maxWidth:680 }}>
            {editMode ? (
              <div>
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
              <div className="fade-in">
                {profileMd
                  ? <div>{renderMd(profileMd)}</div>
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
