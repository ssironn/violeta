import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FileText, Rss, Globe, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const TABS = [
  { label: 'Meus Documentos', path: '/', icon: FileText },
  { label: 'Feed', path: '/feed', icon: Rss },
  { label: 'Explorar', path: '/explore', icon: Globe },
]

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const initial = user?.name?.charAt(0).toUpperCase() || '?'

  return (
    <header className="sticky top-0 z-50 bg-surface-bg/80 backdrop-blur-md border-b border-surface-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="font-serif text-xl font-medium text-text-primary tracking-wide hover:text-violet-300 transition-colors">
          Violeta
        </button>

        <nav className="flex items-center gap-1">
          {TABS.map(({ label, path, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300">
              {initial}
            </div>
            <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface-card border border-surface-border rounded-xl shadow-xl py-1 animate-fade-in">
              <div className="px-3 py-2 border-b border-surface-border">
                <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); setDropdownOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
