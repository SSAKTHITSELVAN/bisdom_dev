import { useState, useEffect } from 'react'
import { getUserReviews } from '@/api/reviews'
import { getCounterpart } from '@/api/leads'
import Spinner from '@/components/ui/Spinner'
import {
  X, Star, MapPin, Shield, Package, Award, Clock,
  Building2, FileText, CreditCard, Truck, ChevronLeft
} from 'lucide-react'

function StarRating({ rating, size = 16 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= rating ? '#f59e0b' : 'transparent'}
          color={i <= rating ? '#f59e0b' : 'rgba(255,255,255,0.2)'}
        />
      ))}
    </div>
  )
}

function ProfileTab({ profile }) {
  const Section = ({ icon: Icon, title, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={14} color="rgba(255,255,255,0.5)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      </div>
      {children}
    </div>
  )

  const InfoRow = ({ label, value }) => {
    if (!value) return null
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#fff', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
      </div>
    )
  }

  const TagList = ({ items }) => {
    if (!items?.length) return <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Not specified</span>
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item, i) => (
          <span key={i} style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 6,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            color: 'rgba(255,255,255,0.7)'
          }}>{item}</span>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Business Summary */}
      {profile.business_summary && (
        <Section icon={FileText} title="About">
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>
            {profile.business_summary}
          </p>
        </Section>
      )}

      {/* Company Info */}
      <Section icon={Building2} title="Company Details">
        <InfoRow label="Business Type" value={profile.business_type} />
        {profile.legal_name && <InfoRow label="Legal Name" value={profile.legal_name} />}
        {profile.gstin && <InfoRow label="GSTIN" value={profile.gstin} />}
        {profile.registration_date && <InfoRow label="Registered Since" value={profile.registration_date} />}
        <InfoRow label="Reliability Score" value={profile.reliability_score ? `${profile.reliability_score}/100` : null} />
      </Section>

      {/* Location */}
      <Section icon={MapPin} title="Location">
        <InfoRow label="State" value={profile.state} />
        {profile.city && <InfoRow label="City" value={profile.city} />}
        {profile.pincode && <InfoRow label="Pincode" value={profile.pincode} />}
        {profile.address && <InfoRow label="Address" value={profile.address} />}
      </Section>

      {/* Products */}
      <Section icon={Package} title="Products">
        <TagList items={profile.product_categories} />
      </Section>

      {/* Certifications */}
      {profile.certifications?.length > 0 && (
        <Section icon={Award} title="Certifications">
          <TagList items={profile.certifications} />
        </Section>
      )}

      {/* Payment Terms */}
      {profile.payment_terms?.length > 0 && (
        <Section icon={CreditCard} title="Payment Terms">
          <TagList items={profile.payment_terms} />
        </Section>
      )}

      {/* Serviceable Locations */}
      {profile.serviceable_locations?.length > 0 && (
        <Section icon={Truck} title="Delivers To">
          <TagList items={profile.serviceable_locations} />
        </Section>
      )}

      {/* Contact revealed notice */}
      {!profile.contact_revealed && (
        <div style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Shield size={14} color="#f59e0b" />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Full contact details revealed after deal closure
          </span>
        </div>
      )}
    </div>
  )
}

function ReviewsTab({ userId }) {
  const [reviews, setReviews] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    getUserReviews(userId)
      .then(res => setReviews(res.data))
      .catch(() => setReviews({ reviews: [], total_reviews: 0, average_rating: 0 }))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Spinner size={20} color="rgba(255,255,255,0.3)" />
    </div>
  )

  if (!reviews?.reviews?.length) return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.3)' }}>
      <Star size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ fontSize: 13, fontWeight: 500 }}>No reviews yet</p>
      <p style={{ fontSize: 11, marginTop: 4 }}>Reviews appear after deals are completed</p>
    </div>
  )

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Summary */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
            {reviews.average_rating}
          </div>
          <StarRating rating={Math.round(reviews.average_rating)} size={12} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {reviews.total_reviews} review{reviews.total_reviews !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Individual Reviews */}
      {reviews.reviews.map(r => (
        <div key={r.id} style={{
          marginBottom: 14, padding: '14px 16px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StarRating rating={r.rating} size={13} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                {r.reviewer_name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          {r.review_text && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '8px 0 0' }}>
              {r.review_text}
            </p>
          )}
          {r.product && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={10} color="rgba(255,255,255,0.25)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                {r.product}{r.deal_value ? ` · ₹${r.deal_value.toLocaleString()}` : ''}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CompanyProfile({ leadId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    getCounterpart(leadId)
      .then(res => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [leadId])

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1225' }}>
      <Spinner size={24} color="rgba(255,255,255,0.3)" />
    </div>
  )

  if (!profile) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1225' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Profile not available</p>
    </div>
  )

  const tabStyle = (isActive) => ({
    flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    textAlign: 'center', borderBottom: `2px solid ${isActive ? '#3b82f6' : 'transparent'}`,
    color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.4)',
    background: 'transparent', border: 'none', borderBottomStyle: 'solid',
    borderBottomWidth: 2, borderBottomColor: isActive ? '#3b82f6' : 'transparent',
    fontFamily: 'Inter,system-ui,sans-serif', transition: 'all 0.2s'
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a1225', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,18,37,0.95) 100%)',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <ChevronLeft size={14} color="rgba(255,255,255,0.6)" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {profile.trade_name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {profile.business_type}{profile.state ? ` · ${profile.state}` : ''}
          </div>
        </div>
        {profile.reliability_score > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 6
          }}>
            <Shield size={11} color="#10b981" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{profile.reliability_score}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => setActiveTab('profile')} style={tabStyle(activeTab === 'profile')}>
          Profile
        </button>
        <button onClick={() => setActiveTab('reviews')} style={tabStyle(activeTab === 'reviews')}>
          Ratings & Reviews
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'profile' ? (
          <ProfileTab profile={profile} />
        ) : (
          <ReviewsTab userId={profile.user_id} />
        )}
      </div>
    </div>
  )
}
