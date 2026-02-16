import { useState, useCallback, useEffect, useRef } from 'react'
import {
  X,
  Plus,
  Trash2,
  TrendingUp,
  Axis3D,
  Table2,
} from 'lucide-react'
import type { PgfplotConfig, PlotSeries, PlotType } from './types'
import { createDefaultPlot } from './types'
import { generatePgfplotsCode } from './pgfplotsGenerator'
import { PlotPreview } from './PlotPreview'
import { PlotConfigForm } from './PlotConfigForm'

export interface PlotEditorProps {
  initialConfig: PgfplotConfig
  onSave: (pgfCode: string, config: PgfplotConfig) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

const PLOT_TYPE_OPTIONS: { type: PlotType; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { type: 'function2d', label: 'Funcao 2D', Icon: TrendingUp },
  { type: 'function3d', label: 'Funcao 3D', Icon: Axis3D },
  { type: 'data', label: 'Dados CSV', Icon: Table2 },
]

function plotIcon(type: PlotType) {
  switch (type) {
    case 'function2d': return TrendingUp
    case 'function3d': return Axis3D
    case 'data': return Table2
  }
}

function plotLabel(type: PlotType): string {
  switch (type) {
    case 'function2d': return 'Funcao 2D'
    case 'function3d': return 'Funcao 3D'
    case 'data': return 'Dados CSV'
  }
}

export function PlotEditor({
  initialConfig,
  onSave,
  onDelete,
  onClose,
  isInsert = false,
}: PlotEditorProps) {
  const [config, setConfig] = useState<PgfplotConfig>(initialConfig)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConfig.plots.length > 0 ? initialConfig.plots[0].id : null,
  )
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(1)

  const addMenuRef = useRef<HTMLDivElement>(null)

  // Close add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showAddMenu])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  const addPlot = useCallback((type: PlotType) => {
    const newPlot = createDefaultPlot(type)
    setConfig((prev) => ({ ...prev, plots: [...prev.plots, newPlot] }))
    setSelectedId(newPlot.id)
    setShowAddMenu(false)
  }, [])

  const deletePlot = useCallback(
    (id: string) => {
      setConfig((prev) => {
        const nextPlots = prev.plots.filter((p) => p.id !== id)
        if (selectedId === id) {
          setSelectedId(nextPlots.length > 0 ? nextPlots[0].id : null)
        }
        return { ...prev, plots: nextPlots }
      })
    },
    [selectedId],
  )

  const updatePlot = useCallback((updated: PlotSeries) => {
    setConfig((prev) => ({
      ...prev,
      plots: prev.plots.map((p) => (p.id === updated.id ? updated : p)),
    }))
  }, [])

  const handleSave = useCallback(() => {
    const code = generatePgfplotsCode(config)
    onSave(code, config)
  }, [config, onSave])

  const zoomIn = useCallback(() => setZoom((z) => Math.min(4, z + 0.25)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.25, z - 0.25)), [])

  const selectedPlot = config.plots.find((p) => p.id === selectedId) ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        className="relative max-w-4xl w-full mx-4 border border-surface-border rounded-2xl shadow-[0_24px_80px_rgba(88,28,135,0.3)] flex flex-col overflow-hidden"
        style={{
          background:
            'linear-gradient(170deg, #2a1842 0%, #1a1028 40%, #150d22 100%)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-accent-100">
            Construtor de Graficos PGFPlots
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-accent-400/60 hover:text-accent-200 hover:bg-white/[0.06] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body: 3 panels ── */}
        <div className="flex min-h-[420px]">
          {/* Left panel – series list */}
          <div className="w-44 border-r border-white/[0.06] flex flex-col p-3 gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-400/40 mb-1">
              Series
            </span>

            <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
              {config.plots.map((plot) => {
                const Icon = plotIcon(plot.type)
                const isSelected = plot.id === selectedId
                return (
                  <button
                    key={plot.id}
                    type="button"
                    onClick={() => setSelectedId(plot.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                      isSelected
                        ? 'bg-accent-500/20 border border-accent-500/30 text-accent-200'
                        : 'hover:bg-white/[0.04] text-accent-300/60 border border-transparent'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="truncate">
                      {plot.legendEntry || plotLabel(plot.type)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deletePlot(plot.id)
                      }}
                      className="ml-auto p-0.5 rounded hover:bg-red-500/20 text-accent-400/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </button>
                )
              })}
            </div>

            {/* Add plot button + dropdown */}
            <div className="relative" ref={addMenuRef}>
              <button
                type="button"
                onClick={() => setShowAddMenu((v) => !v)}
                className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-accent-400/60 hover:text-accent-300 hover:bg-white/[0.04] border border-transparent transition-colors"
              >
                <Plus size={14} />
                <span>Serie</span>
              </button>

              {showAddMenu && (
                <div className="absolute bottom-full left-0 mb-1 w-48 bg-[#1e1334] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 z-10">
                  {PLOT_TYPE_OPTIONS.map(({ type, label, Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addPlot(type)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] text-accent-300/80 hover:text-accent-100 hover:bg-white/[0.06] transition-colors"
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center panel – config form */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedPlot ? (
              <PlotConfigForm
                plot={selectedPlot}
                axis={config.axis}
                onPlotChange={updatePlot}
                onAxisChange={(axis) => setConfig((prev) => ({ ...prev, axis }))}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-accent-400/40 text-sm">
                Adicione uma serie para comecar
              </div>
            )}
          </div>

          {/* Right panel – preview */}
          <div className="w-80 border-l border-white/[0.06] flex flex-col p-3 gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-400/40 mb-1">
              Pre-visualizacao
            </span>

            <div className="flex-1 min-h-0">
              <PlotPreview
                config={config}
                selectedId={selectedId ?? undefined}
                showGrid={showGrid}
                zoom={zoom}
                width={280}
                height={300}
              />
            </div>

            {/* Grid toggle + zoom controls */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] text-accent-400/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="accent-accent-500"
                  />
                  Grade
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={zoomOut}
                    disabled={zoom <= 0.25}
                    className="p-1 rounded text-accent-400/60 hover:text-accent-200 hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <span className="text-xs font-bold leading-none">-</span>
                  </button>
                  <span className="text-[11px] text-accent-300/60 w-10 text-center tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={zoomIn}
                    disabled={zoom >= 4}
                    className="p-1 rounded text-accent-400/60 hover:text-accent-200 hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <span className="text-xs font-bold leading-none">+</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
          <div>
            {!isInsert && (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-1.5 rounded-lg text-[12px] text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
              >
                Remover
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-[12px] text-accent-300/60 hover:text-accent-200 hover:bg-white/[0.04] border border-transparent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={config.plots.length === 0}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {isInsert ? 'Inserir' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
