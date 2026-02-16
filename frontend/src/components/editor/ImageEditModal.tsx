import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'

const WIDTH_PRESETS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
]

interface ImageEditModalProps {
  src: string
  alt: string
  options: string
  onSave: (attrs: { alt: string; options: string }) => void
  onDelete: () => void
  onClose: () => void
}

function parseWidthValue(options: string): number {
  const m = options.match(/width\s*=\s*([\d.]+)\\textwidth/)
  if (m) return parseFloat(m[1])
  return 0.8
}

function buildOptions(widthFraction: number): string {
  return `width=${widthFraction}\\textwidth`
}

export function ImageEditModal({ src, alt: initialAlt, options: initialOptions, onSave, onDelete, onClose }: ImageEditModalProps) {
  const [alt, setAlt] = useState(initialAlt || '')
  const [widthValue, setWidthValue] = useState(() => parseWidthValue(initialOptions || 'width=0.8\\textwidth'))

  function handleSave() {
    onSave({ alt: alt.trim(), options: buildOptions(widthValue) })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault()
      handleSave()
    }
  }

  const widthPercent = Math.round(widthValue * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative border border-surface-border rounded-2xl shadow-[0_24px_80px_rgba(88,28,135,0.3)] overflow-hidden w-full max-w-lg mx-4 max-h-[90vh] flex flex-col v-modal-bg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b v-modal-divider">
          <h3 className="text-[13px] font-semibold tracking-wide text-accent-200 uppercase">
            Editar Imagem
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {/* Preview */}
          {src && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-accent-300/70 mb-1.5">
                Pré-visualização
              </label>
              <div className="rounded-xl v-modal-preview-box p-3 flex items-center justify-center min-h-[80px] max-h-[200px] overflow-hidden">
                <img
                  src={src}
                  alt={alt || 'preview'}
                  className="max-w-full max-h-[180px] object-contain rounded"
                />
              </div>
            </div>
          )}

          {/* Alt text */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-accent-300/70 mb-1.5">
              Legenda
              <span className="text-accent-400/30 ml-1 normal-case tracking-normal">(caption)</span>
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Descrição da imagem"
              autoFocus
              className="w-full v-modal-input rounded-lg px-3 py-2 text-sm text-accent-100 placeholder:text-accent-100/20 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 transition-all"
            />
          </div>

          {/* Width control */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-accent-300/70 mb-1.5">
              Largura — {widthPercent}%
            </label>
            <div className="flex items-center gap-2 mb-2">
              {WIDTH_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setWidthValue(preset.value)}
                  className={`px-3 py-1 text-[12px] font-medium rounded-lg transition-all ${
                    widthValue === preset.value
                      ? 'bg-accent-500/20 text-accent-200 border border-accent-500/30'
                      : 'text-accent-300/40 hover:text-accent-300/70 hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={widthPercent}
              onChange={(e) => setWidthValue(parseInt(e.target.value) / 100)}
              className="w-full accent-purple-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t v-modal-divider v-modal-footer">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Excluir
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 text-[13px] font-semibold bg-accent-500 text-white rounded-lg hover:bg-accent-400 transition-colors shadow-lg shadow-accent-500/20"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
