import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyGST, completeOnboard } from '../../api/onboarding'
import { useAuthStore } from '../../store/authStore'
import Logo from '../ui/Logo'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'
import { CheckCircle, Building2, ChevronRight } from 'lucide-react'

export default function OnboardingPage() {
  const [gstin, setGstin] = useState('')
  const [gstData, setGstData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const navigate = useNavigate()
  const setOnboarded = useAuthStore(s => s.setOnboarded)

  const handleVerifyGST = async () => {
    if (gstin.length < 15) { toast.error('Enter valid 15-character GSTIN'); return }
    setLoading(true)
    try {
      const res = await verifyGST(gstin.toUpperCase())
      if (res.data.valid) {
        setGstData(res.data)
        toast.success('GSTIN verified!')
      } else {
        toast.error(res.data.error || 'Invalid GSTIN')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await completeOnboard({ gstin: gstin.toUpperCase() })
      setOnboarded()
      toast.success('Welcome to Bisdom!')
      navigate('/workspace', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Onboarding failed')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="bg-bisdom min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <Logo size="md" />
          <p className="text-white/40 text-sm mt-3 font-medium">Setup your business profile</p>
        </div>

        <div className="glass rounded-3xl p-7 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <Building2 size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">GST Verification</h2>
              <p className="text-xs text-white/40">Verify your business identity</p>
            </div>
          </div>

          <input className="bisdom-input mb-4 uppercase tracking-widest font-mono"
            placeholder="29AACCG0527D1Z8"
            value={gstin}
            onChange={e => setGstin(e.target.value.toUpperCase().slice(0,15))}
            maxLength={15}
            disabled={!!gstData}
          />

          {gstData && (
            <div className="glass-dark rounded-2xl p-4 mb-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">{gstData.trade_name || gstData.legal_name}</p>
                  <p className="text-white/50 text-xs mt-1">{gstData.business_type}</p>
                  <p className="text-white/40 text-xs">{gstData.city}, {gstData.state}</p>
                  <span className={`badge mt-2 ${gstData.gst_status === 'Active' ? 'badge-green' : 'badge-red'}`}>
                    GST {gstData.gst_status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!gstData
            ? <button className="btn-primary flex items-center justify-center gap-2" onClick={handleVerifyGST} disabled={loading}>
                {loading && <Spinner size={16}/>} Verify GSTIN
              </button>
            : <button className="btn-primary flex items-center justify-center gap-2" onClick={handleComplete} disabled={completing}>
                {completing && <Spinner size={16}/>} Continue to Dashboard <ChevronRight size={16}/>
              </button>
          }
        </div>
      </div>
    </div>
  )
}
