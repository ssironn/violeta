import { useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'

type Mode = 'login' | 'register'

export function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
    } catch (err: any) {
      setError(err?.message ?? 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-bg relative overflow-hidden">
      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #8b5cf6 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, #d4a574 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Decorative gradient orb */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent-600/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

      <div className="w-full max-w-sm mx-4 relative z-10 animate-slide-up">
        {/* Brand header — outside the card */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-5xl font-medium text-text-primary tracking-wide">
            Violeta
          </h1>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-accent-500/40" />
            <p className="text-text-muted text-xs tracking-[0.2em] uppercase">
              Visual LaTeX Editor
            </p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-accent-500/40" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-panel/80 backdrop-blur-sm rounded-2xl border border-surface-border/60 shadow-2xl shadow-accent-950/20 p-7">
          {/* Mode tabs */}
          <div className="flex mb-6 bg-surface-bg/60 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/25'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/25'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="animate-slide-up">
                <label htmlFor="name" className="block text-xs font-medium text-text-muted mb-1.5 tracking-wide uppercase">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-bg/80 border border-surface-border text-text-primary placeholder-text-muted/50 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-muted mb-1.5 tracking-wide uppercase">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-bg/80 border border-surface-border text-text-primary placeholder-text-muted/50 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-muted mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-bg/80 border border-surface-border text-text-primary placeholder-text-muted/50 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                placeholder="Enter your password"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-error text-sm py-2.5 px-3.5 bg-error/5 rounded-lg border border-error/20 animate-scale-in">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 text-white font-medium text-sm hover:from-accent-500 hover:to-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-accent-600/20 hover:shadow-accent-500/30 active:scale-[0.98]"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          {/* Toggle link */}
          <p className="text-center text-text-muted text-sm mt-6">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-gold hover:text-gold/80 font-medium transition-colors"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-gold hover:text-gold/80 font-medium transition-colors"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted/50 text-[11px] mt-6 tracking-wide">
          A beautiful way to write LaTeX
        </p>
      </div>
    </div>
  )
}
