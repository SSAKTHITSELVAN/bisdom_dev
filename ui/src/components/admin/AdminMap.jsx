import { useState, useEffect } from 'react'
import { getMapData } from '@/api/admin'
import { MapPin, Building2, Phone, Star, TrendingUp, Package } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

export default function AdminMap() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState(null)

  useEffect(() => {
    loadMapData()
  }, [])

  const loadMapData = async () => {
    try {
      const response = await getMapData()
      setLocations(response.data.locations)
    } catch (error) {
      console.error('Failed to load map data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group locations by state
  const locationsByState = locations.reduce((acc, loc) => {
    const state = loc.state || 'Unknown'
    if (!acc[state]) {
      acc[state] = []
    }
    acc[state].push(loc)
    return acc
  }, {})

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Supplier Map
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Geographic distribution of suppliers across India
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={32} color="rgba(255,255,255,0.4)" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          {/* Map Placeholder (Left) */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 600
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
              India Supplier Network
            </h3>

            {/* Simple visual representation */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* State-wise distribution */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {Object.entries(locationsByState).map(([state, locs]) => (
                  <div key={state} style={{
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 12,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                  onClick={() => setSelectedLocation(state)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <MapPin size={16} color="#60a5fa" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {state}
                      </span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa' }}>
                      {locs.length}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      {locs.length === 1 ? 'supplier' : 'suppliers'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary stats at bottom */}
              <div style={{
                marginTop: 24,
                padding: 20,
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                      Total Suppliers
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>
                      {locations.length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                      States Covered
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>
                      {Object.keys(locationsByState).length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                      Avg. per State
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>
                      {(locations.length / Math.max(Object.keys(locationsByState).length, 1)).toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier List (Right) */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 600,
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
              {selectedLocation ? `Suppliers in ${selectedLocation}` : 'All Suppliers'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(selectedLocation ? locationsByState[selectedLocation] : locations).map((loc) => (
                <div key={loc.id} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: 14,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Building2 size={18} color="#34d399" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                        {loc.supplier_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        <MapPin size={12} />
                        <span>{loc.location_text}</span>
                      </div>
                    </div>
                  </div>

                  {loc.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                      <Phone size={12} />
                      <span>{loc.phone}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={12} color="#fbbf24" />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                        {loc.reliability_score}/100
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={12} color="#60a5fa" />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                        {loc.leads_count} leads
                      </span>
                    </div>
                  </div>

                  {loc.product_categories && loc.product_categories.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Package size={12} color="rgba(255,255,255,0.4)" />
                      {loc.product_categories.slice(0, 2).map((cat, idx) => (
                        <span key={idx} style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 600,
                          background: 'rgba(139,92,246,0.15)',
                          color: '#a78bfa',
                          textTransform: 'uppercase'
                        }}>
                          {cat}
                        </span>
                      ))}
                      {loc.product_categories.length > 2 && (
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                          +{loc.product_categories.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedLocation && (
              <button
                onClick={() => setSelectedLocation(null)}
                className="btn-ghost"
                style={{
                  marginTop: 16,
                  padding: '10px 16px',
                  fontSize: 12
                }}
              >
                Show All Suppliers
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
