import { useState, useRef, useCallback, useMemo } from 'react'
import { Copy, Check, Loader2, AlertCircle, Pencil, Eye, Play, RotateCw } from 'lucide-react'
import { beautifyLatex } from '../../latex/beautifyLatex'

type Tab = 'pdf' | 'code'

interface RightPanelProps {
  latex: string
  editingLatex: boolean
  onToggleEditing: () => void
  onLatexChange: (latex: string) => void
  highlightedMath: string | null
  pdfUrl: string | null
  pdfCompiling: boolean
  pdfError: string | null
  autoCompile: boolean
  onSetAutoCompile: (v: boolean) => void
  onCompile: () => void
}

function syntaxHighlight(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(\\[a-zA-Z]+)/g, '<span class="text-violet-300">$1</span>')
    .replace(/(\{|\})/g, '<span class="text-yellow-400">$1</span>')
    .replace(/(%.+)/g, '<span class="text-text-muted">$1</span>')
    .replace(/(\[|\])/g, '<span class="text-blue-400">$1</span>')
}

function highlightLatex(code: string, hoveredMath: string | null): string {
  if (!hoveredMath) return syntaxHighlight(code)

  const needle = `$${hoveredMath}$`
  const idx = code.indexOf(needle)
  if (idx === -1) return syntaxHighlight(code)

  const before = code.slice(0, idx)
  const match = code.slice(idx, idx + needle.length)
  const after = code.slice(idx + needle.length)

  return (
    syntaxHighlight(before) +
    '<mark class="bg-violet-500/25 outline outline-1 outline-violet-400/40 rounded-sm">' +
    syntaxHighlight(match) +
    '</mark>' +
    syntaxHighlight(after)
  )
}

export function RightPanel({ latex, editingLatex, onToggleEditing, onLatexChange, highlightedMath, pdfUrl, pdfCompiling: compiling, pdfError: error, autoCompile, onSetAutoCompile, onCompile }: RightPanelProps) {
  const [tab, setTab] = useState<Tab>('pdf')
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const beautified = useMemo(() => beautifyLatex(latex), [latex])

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(latex).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [latex])

  return (
    <div className="w-full bg-surface-panel border-l border-surface-border flex flex-col flex-shrink-0 hidden lg:flex">
      {/* Tab bar */}
      <div className="flex items-center border-b border-surface-border">
        <button
          onClick={() => setTab('pdf')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
            tab === 'pdf'
              ? 'text-violet-300 border-b-2 border-violet-500 bg-violet-500/5'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            PDF
            {compiling && <Loader2 size={11} className="animate-spin" />}
          </span>
        </button>
        <button
          onClick={() => setTab('code')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
            tab === 'code'
              ? 'text-violet-300 border-b-2 border-violet-500 bg-violet-500/5'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Código LaTeX
        </button>
      </div>

      {/* PDF tab */}
      {tab === 'pdf' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Compile controls bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border/50">
            <button
              onClick={onCompile}
              disabled={compiling}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {compiling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              <span>{compiling ? 'Compilando...' : 'Compilar'}</span>
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <span className="text-[11px] text-text-muted">Auto</span>
              <button
                onClick={() => onSetAutoCompile(!autoCompile)}
                className={`relative w-7 h-4 rounded-full transition-colors ${
                  autoCompile ? 'bg-violet-500' : 'bg-surface-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    autoCompile ? 'translate-x-3' : ''
                  }`}
                />
              </button>
            </label>
          </div>

          {compiling && !pdfUrl && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
              <Loader2 size={24} className="animate-spin text-violet-400" />
              <span className="text-xs">Compilando via texlive.net...</span>
            </div>
          )}

          {error && !pdfUrl && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle size={24} className="text-red-400" />
              <span className="text-xs text-red-300">Erro ao compilar</span>
              <span className="text-[11px] text-text-muted leading-relaxed">{error}</span>
            </div>
          )}

          {pdfUrl && (
            <div className="flex-1 relative">
              {compiling && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-elevated/90 border border-surface-border text-[10px] text-violet-300">
                  <RotateCw size={10} className="animate-spin" />
                  Recompilando...
                </div>
              )}
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            </div>
          )}

          {!compiling && !error && !pdfUrl && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-muted px-6 text-center">
              <div className="flex flex-col gap-2">
                <span className="text-xs">Clique em <strong className="text-violet-300">Compilar</strong> para gerar o PDF.</span>
                <span className="text-[11px] text-text-muted/70 leading-relaxed">
                  O preview mostrado aqui é o resultado final compilado pelo servidor texlive.net. Enquanto não compilar, esta área ficará em branco.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code tab */}
      {tab === 'code' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Code header with edit toggle + copy button */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border/50">
            {/* Edit toggle */}
            <button
              onClick={onToggleEditing}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                editingLatex
                  ? 'text-violet-300 bg-violet-500/15 border border-violet-500/30'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent'
              }`}
            >
              {editingLatex ? (
                <>
                  <Pencil size={11} />
                  <span>Editando</span>
                </>
              ) : (
                <>
                  <Eye size={11} />
                  <span>Visualizando</span>
                </>
              )}
            </button>

            {/* Copy button */}
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              title="Copiar código"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-success" />
                  <span className="text-success">Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* Code content */}
          {editingLatex ? (
            <textarea
              ref={textareaRef}
              value={latex}
              onChange={(e) => onLatexChange(e.target.value)}
              className="flex-1 overflow-auto p-4 text-xs leading-relaxed font-mono text-text-primary bg-transparent resize-none focus:outline-none whitespace-pre-wrap"
              spellCheck={false}
            />
          ) : (
            <pre
              className="flex-1 overflow-auto p-4 text-xs leading-relaxed font-mono text-text-primary whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: highlightLatex(beautified, highlightedMath) }}
            />
          )}
        </div>
      )}
    </div>
  )
}
