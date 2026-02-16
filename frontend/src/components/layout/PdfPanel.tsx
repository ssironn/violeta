import { Loader2, AlertCircle, Play, RotateCw } from 'lucide-react'

interface PdfPanelProps {
  pdfUrl: string | null
  pdfCompiling: boolean
  pdfError: string | null
  autoCompile: boolean
  onSetAutoCompile: (v: boolean) => void
  onCompile: () => void
}

export function PdfPanel({
  pdfUrl,
  pdfCompiling: compiling,
  pdfError: error,
  autoCompile,
  onSetAutoCompile,
  onCompile,
}: PdfPanelProps) {
  return (
    <div className="w-full bg-surface-panel flex flex-col flex-shrink-0">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Compile controls bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border/50">
          <button
            onClick={onCompile}
            disabled={compiling}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all bg-accent-600 hover:bg-accent-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-accent-600/20"
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
                autoCompile ? 'bg-accent-500' : 'bg-surface-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${
                  autoCompile ? 'translate-x-3' : ''
                }`}
              />
            </button>
          </label>
        </div>

        {compiling && !pdfUrl && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
            <Loader2 size={24} className="animate-spin text-accent-400" />
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
          <div className="flex-1 relative min-h-0">
            {compiling && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-elevated/90 border border-surface-border text-[10px] text-accent-300">
                <RotateCw size={10} className="animate-spin" />
                Recompilando...
              </div>
            )}
            <iframe
              src={pdfUrl}
              className="absolute inset-0 w-full h-full border-0"
              title="PDF Preview"
            />
          </div>
        )}

        {!compiling && !error && !pdfUrl && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-muted px-6 text-center">
            <div className="flex flex-col gap-2">
              <span className="text-xs">Clique em <strong className="text-accent-300">Compilar</strong> para gerar o PDF.</span>
              <span className="text-[11px] text-text-muted/70 leading-relaxed">
                O preview mostrado aqui é o resultado final compilado pelo servidor texlive.net.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
