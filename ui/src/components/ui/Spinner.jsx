export default function Spinner({ size = 20, color = 'rgba(255,255,255,0.7)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
    </svg>
  )
}
