import { useWorkspaceStore } from '@/store/workspaceStore'
import { Sparkles, Package, TrendingUp, Bot } from 'lucide-react'

export default function WelcomeScreen() {
  const { goNewReq } = useWorkspaceStore()

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a1628', padding: '40px 20px'
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }} className="fade-in">
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'rgba(96,165,250,0.15)',
          border: '1px solid rgba(96,165,250,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <Sparkles size={28} color="#60a5fa" />
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#fff',
          marginBottom: 10, letterSpacing: '-0.5px'
        }}>
          What do you need today?
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 36 }}>
          Post a procurement requirement and our AI agents will find, match,
          and negotiate with suppliers simultaneously — on your behalf.
        </p>

        <button
          onClick={() => goNewReq()}
          className="btn-primary"
          style={{ width: 'auto', padding: '13px 32px', fontSize: 14, borderRadius: 12 }}
        >
          + Post a Requirement
        </button>

        {/* Feature cards */}
        <div className="welcome-features" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 40 }}>
          {[
            { icon: Bot, title: 'AI Negotiates', desc: 'Agents negotiate with multiple sellers simultaneously' },
            { icon: Package, title: 'Grouped Chats', desc: 'All seller conversations grouped under your requirement' },
            { icon: TrendingUp, title: 'Best Deal', desc: 'Compare all offers and pick the winner in one tap' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '16px 14px', textAlign: 'left'
            }}>
              <Icon size={18} color="#60a5fa" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
