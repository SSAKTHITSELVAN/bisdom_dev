export default function Logo({ size = 'md', showTagline = false }) {
  const sizes = { sm: 'text-xl', md: 'text-3xl', lg: 'text-5xl' }
  return (
    <div className="flex flex-col items-center">
      <div className={`font-black tracking-tight ${sizes[size]}`}
        style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <span style={{ background: 'linear-gradient(135deg,#fff 0%,#93c5fd 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Bis
        </span>
        <span style={{ background: 'linear-gradient(135deg,#60a5fa 0%,#1A8FFF 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          dom
        </span>
      </div>
      {showTagline && (
        <p className="text-xs text-white/40 mt-1 tracking-widest uppercase font-medium">
          AI Commerce Engine
        </p>
      )}
    </div>
  )
}
