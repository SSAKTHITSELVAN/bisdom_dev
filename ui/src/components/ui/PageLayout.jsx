import BottomNav from './BottomNav'

export default function PageLayout({ children, title, back, action }) {
  return (
    <div className="bg-bisdom min-h-screen flex flex-col relative">
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        {title && (
          <header className="flex items-center justify-between px-4 pt-12 pb-4">
            <div className="flex items-center gap-3">
              {back && (
                <button onClick={back}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
            </div>
            {action && action}
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 pb-24">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
