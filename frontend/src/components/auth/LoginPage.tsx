import { useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import previewImg from '../../assets/preview-auth.png'

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
    <div className="flex h-screen bg-surface-bg overflow-hidden">
      {/* Left side — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative overflow-hidden px-6">
        {/* Subtle background texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #8b5cf6 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, #d4a574 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent-600/8 rounded-full blur-3xl" />

        <div className="w-full max-w-xs relative z-10 animate-slide-up">
          {/* Brand header */}
          <div className="mb-6">
            <h1 className="font-serif text-4xl font-medium text-text-primary tracking-wide">
              Violeta
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <p className="text-text-muted text-xs tracking-[0.2em] uppercase">
                Visual LaTeX Editor
              </p>
              <span className="h-px flex-1 bg-gradient-to-r from-accent-500/40 to-transparent" />
            </div>
          </div>

          {/* Card */}
          <div className="bg-surface-panel/80 backdrop-blur-sm rounded-xl border border-surface-border/60 shadow-2xl shadow-accent-950/20 p-5">
            {/* Mode tabs */}
            <div className="flex mb-5 bg-surface-bg/60 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
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
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  mode === 'register'
                    ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/25'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Register
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <div className="animate-slide-up">
                  <label htmlFor="name" className="block text-[11px] font-medium text-text-muted mb-1 tracking-wide uppercase">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-bg/80 border border-surface-border text-text-primary placeholder-text-muted/50 text-xs focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-[11px] font-medium text-text-muted mb-1 tracking-wide uppercase">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-surface-bg/80 border border-surface-border text-text-primary placeholder-text-muted/50 text-xs focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-[11px] font-medium text-text-muted mb-1 tracking-wide uppercase">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-surface-bg/80 border border-surface-border text-text-primary placeholder-text-muted/50 text-xs focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                  placeholder="Enter your password"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="text-error text-xs py-2 px-3 bg-error/5 rounded-lg border border-error/20 animate-scale-in">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 text-white font-medium text-xs hover:from-accent-500 hover:to-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-accent-600/20 hover:shadow-accent-500/30 active:scale-[0.98]"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>
            </form>

            {/* Toggle link */}
            <p className="text-center text-text-muted text-xs mt-5">
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
          <p className="text-text-muted/50 text-[11px] mt-6 tracking-wide">
            A beautiful way to write LaTeX
          </p>
        </div>
      </div>

      {/* Right side — CTA + Preview (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-950 via-accent-900/80 to-surface-bg" />

        {/* Geometric pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(30deg, #8b5cf6 12%, transparent 12.5%, transparent 87%, #8b5cf6 87.5%, #8b5cf6),
              linear-gradient(150deg, #8b5cf6 12%, transparent 12.5%, transparent 87%, #8b5cf6 87.5%, #8b5cf6),
              linear-gradient(30deg, #8b5cf6 12%, transparent 12.5%, transparent 87%, #8b5cf6 87.5%, #8b5cf6),
              linear-gradient(150deg, #8b5cf6 12%, transparent 12.5%, transparent 87%, #8b5cf6 87.5%, #8b5cf6),
              linear-gradient(60deg, #d4a57433 25%, transparent 25.5%, transparent 75%, #d4a57433 75%, #d4a57433),
              linear-gradient(60deg, #d4a57433 25%, transparent 25.5%, transparent 75%, #d4a57433 75%, #d4a57433)
            `,
            backgroundSize: '80px 140px',
            backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px',
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-accent-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/6 w-64 h-64 bg-gold/8 rounded-full blur-3xl" />

        {/* Content — CTA top, image bottom, no overlap */}
        <div className="relative z-10 flex flex-col h-full pl-14">
          {/* CTA text — sits at top with vertical centering bias */}
          <div className="max-w-sm pt-[15vh]">
            <h2 className="text-2xl font-serif font-medium text-text-primary leading-tight">
              Crie documentos LaTeX
              <br />
              <span className="text-gold">visualmente.</span>
            </h2>
            <p className="text-text-secondary mt-4 text-sm leading-relaxed">
              Um editor visual intuitivo que gera LaTeX de alta qualidade.
              Escreva provas, artigos e documentos acadêmicos sem precisar
              memorizar comandos.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-6">
              {['Gráficos', 'Fórmulas', 'Tabelas', 'Imagens'].map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-text-secondary"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Preview image — in flow, overflows right and clips at bottom */}
          <div className="mt-auto pt-8 relative min-h-0">
            <div className="absolute -inset-4 -left-2 bg-gradient-to-r from-accent-500/15 to-transparent rounded-2xl blur-2xl" />
            <div className="relative rounded-tl-xl overflow-hidden border border-white/10 border-r-0 border-b-0 shadow-2xl shadow-black/50 mr-[-20%]">
              <img
                src={previewImg}
                alt="Violeta editor preview"
                className="w-full h-auto min-w-[600px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
