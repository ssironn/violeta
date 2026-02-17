import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import previewImg from '../../assets/preview-auth.png'
import katex from 'katex'

type Mode = 'login' | 'register'

/* ── Floating LaTeX formulas for the CTA side ── */

const FLOATING_FORMULAS = [
  { latex: '\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}', x: '8%', y: '12%', size: 0.85, delay: 0 },
  { latex: '\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}', x: '62%', y: '8%', size: 0.78, delay: 0.8 },
  { latex: 'e^{i\\pi} + 1 = 0', x: '35%', y: '28%', size: 0.92, delay: 0.4 },
  { latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}', x: '72%', y: '32%', size: 0.8, delay: 1.2 },
  { latex: '\\mathcal{L}\\{f(t)\\} = \\int_0^\\infty f(t)e^{-st}\\,dt', x: '15%', y: '45%', size: 0.72, delay: 1.6 },
  { latex: '\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u', x: '55%', y: '52%', size: 0.82, delay: 2.0 },
  { latex: '\\det(A - \\lambda I) = 0', x: '25%', y: '65%', size: 0.76, delay: 2.4 },
  { latex: '\\oint_C \\vec{F} \\cdot d\\vec{r} = \\iint_S (\\nabla \\times \\vec{F}) \\cdot d\\vec{S}', x: '60%', y: '70%', size: 0.7, delay: 1.0 },
]

function FloatingFormula({
  latex,
  x,
  y,
  size,
  delay,
}: {
  latex: string
  x: string
  y: string
  size: number
  delay: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(latex, ref.current, {
        displayMode: false,
        throwOnError: false,
      })
    } catch {
      // silently ignore
    }
  }, [latex])

  return (
    <span
      ref={ref}
      className="login-floating-formula"
      style={{
        left: x,
        top: y,
        fontSize: `${size}rem`,
        animationDelay: `${delay}s`,
      }}
    />
  )
}

/* ── Feature icons for CTA pills ── */

function IconGraph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconFormula() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconTable() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  )
}

function IconImage() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

const FEATURES = [
  { label: 'Gráficos', icon: IconGraph },
  { label: 'Fórmulas', icon: IconFormula },
  { label: 'Tabelas', icon: IconTable },
  { label: 'Imagens', icon: IconImage },
]

/* ── Main Login Page ── */

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
      setError(err?.message ?? 'Ocorreu um erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  return (
    <div className="login-page">
      {/* ── Left side: Form ── */}
      <div className="login-form-side">
        {/* Background decorations */}
        <div className="login-form-bg-dots" />
        <div className="login-form-bg-glow" />

        <div className="login-form-container">
          {/* Brand */}
          <div className="login-brand">
            <h1 className="login-brand-name">Violeta</h1>
            <div className="login-brand-tagline">
              <span className="login-brand-tagline-text">Editor LaTeX Visual</span>
              <span className="login-brand-tagline-line" />
            </div>
          </div>

          {/* Card */}
          <div className="login-card">
            {/* Mode tabs */}
            <div className="login-tabs">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`login-tab ${mode === 'login' ? 'login-tab--active' : ''}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`login-tab ${mode === 'register' ? 'login-tab--active' : ''}`}
              >
                Criar conta
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form">
              {mode === 'register' && (
                <div className="login-field login-field--animate">
                  <label htmlFor="name" className="login-label">Nome</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="login-input"
                    placeholder="Seu nome"
                  />
                </div>
              )}

              <div className="login-field">
                <label htmlFor="email" className="login-label">E-mail</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                  placeholder="voce@exemplo.com"
                />
              </div>

              <div className="login-field">
                <label htmlFor="password" className="login-label">Senha</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="login-input"
                  placeholder="Sua senha"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="login-error">{error}</div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="login-submit"
              >
                {loading ? (
                  <span className="login-submit-loading">
                    <svg className="login-spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    Aguarde...
                  </span>
                ) : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>

            {/* Toggle */}
            <p className="login-toggle">
              {mode === 'login' ? (
                <>
                  Ainda n&atilde;o tem conta?{' '}
                  <button type="button" onClick={() => switchMode('register')} className="login-toggle-link">
                    Registre-se
                  </button>
                </>
              ) : (
                <>
                  J&aacute; tem uma conta?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="login-toggle-link">
                    Entrar
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Footer */}
          <p className="login-footer">Uma forma elegante de criar LaTeX</p>
        </div>
      </div>

      {/* ── Right side: CTA + Preview ── */}
      <div className="login-cta-side">
        {/* Background layers */}
        <div className="login-cta-bg-gradient" />
        <div className="login-cta-bg-grid" />

        {/* Floating LaTeX formulas */}
        <div className="login-floating-layer">
          {FLOATING_FORMULAS.map((f, i) => (
            <FloatingFormula key={i} {...f} />
          ))}
        </div>

        {/* Glow orbs */}
        <div className="login-cta-glow login-cta-glow--1" />
        <div className="login-cta-glow login-cta-glow--2" />

        {/* Content */}
        <div className="login-cta-content">
          <div className="login-cta-text">
            <h2 className="login-cta-heading">
              Crie documentos LaTeX
              <br />
              <span className="login-cta-heading-accent">visualmente.</span>
            </h2>
            <p className="login-cta-description">
              Um editor visual intuitivo que gera LaTeX de alta qualidade.
              Escreva provas, artigos e documentos acadêmicos sem precisar
              memorizar comandos.
            </p>

            {/* Feature pills */}
            <div className="login-cta-features">
              {FEATURES.map(({ label, icon: Icon }) => (
                <span key={label} className="login-cta-pill">
                  <Icon />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Preview image */}
          <div className="login-cta-preview">
            <div className="login-cta-preview-glow" />
            <div className="login-cta-preview-frame">
              <img
                src={previewImg}
                alt="Preview do editor Violeta"
                className="login-cta-preview-img"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
