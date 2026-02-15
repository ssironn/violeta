import { useState, useCallback, useEffect, useRef } from 'react'
import {
  X,
  Plus,
  Trash2,
  Circle,
  Square,
  Triangle,
  Pentagon,
  Hexagon,
} from 'lucide-react'
import type { TikzShape, ShapeType } from './types'
import { createDefaultShape } from './types'
import { generateTikzCode } from './tikzGenerator'
import { TikzPreview } from './TikzPreview'
import { ShapeConfigForm } from './ShapeConfigForm'

interface TikzShapeEditorProps {
  initialShapes: TikzShape[]
  onSave: (tikzCode: string, shapes: TikzShape[]) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

const SHAPE_TYPE_OPTIONS: { type: ShapeType; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { type: 'circle', label: 'Círculo', Icon: Circle },
  { type: 'square', label: 'Quadrado', Icon: Square },
  { type: 'rectangle', label: 'Retângulo', Icon: Square },
  { type: 'triangle', label: 'Triângulo', Icon: Triangle },
  { type: 'regular-polygon', label: 'Polígono regular', Icon: Pentagon },
  { type: 'custom-polygon', label: 'Polígono personalizado', Icon: Hexagon },
]

function shapeIcon(type: ShapeType) {
  switch (type) {
    case 'circle': return Circle
    case 'square': return Square
    case 'rectangle': return Square
    case 'triangle': return Triangle
    case 'regular-polygon': return Pentagon
    case 'custom-polygon': return Hexagon
  }
}

function shapeLabel(type: ShapeType): string {
  switch (type) {
    case 'circle': return 'Círculo'
    case 'square': return 'Quadrado'
    case 'rectangle': return 'Retângulo'
    case 'triangle': return 'Triângulo'
    case 'regular-polygon': return 'Polígono regular'
    case 'custom-polygon': return 'Polígono personalizado'
  }
}

export function TikzShapeEditor({
  initialShapes,
  onSave,
  onDelete,
  onClose,
  isInsert = false,
}: TikzShapeEditorProps) {
  const [shapes, setShapes] = useState<TikzShape[]>(initialShapes)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialShapes.length > 0 ? initialShapes[0].id : null,
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

  const addShape = useCallback((type: ShapeType) => {
    const newShape = createDefaultShape(type)
    setShapes((prev) => [...prev, newShape])
    setSelectedId(newShape.id)
    setShowAddMenu(false)
  }, [])

  const deleteShape = useCallback(
    (id: string) => {
      setShapes((prev) => {
        const next = prev.filter((s) => s.id !== id)
        if (selectedId === id) {
          setSelectedId(next.length > 0 ? next[0].id : null)
        }
        return next
      })
    },
    [selectedId],
  )

  const updateShape = useCallback((updated: TikzShape) => {
    setShapes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }, [])

  const handleSave = useCallback(() => {
    const tikz = generateTikzCode(shapes)
    onSave(tikz, shapes)
  }, [shapes, onSave])

  const zoomIn = useCallback(() => setZoom((z) => Math.min(4, z + 0.25)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.25, z - 0.25)), [])

  const selectedShape = shapes.find((s) => s.id === selectedId) ?? null

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
          <h2 className="text-sm font-semibold text-violet-100">
            Construtor de Figuras TikZ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-violet-400/60 hover:text-violet-200 hover:bg-white/[0.06] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body: 3 panels ── */}
        <div className="flex min-h-[420px]">
          {/* Left panel – shape list */}
          <div className="w-44 border-r border-white/[0.06] flex flex-col p-3 gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/40 mb-1">
              Formas
            </span>

            <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
              {shapes.map((shape) => {
                const Icon = shapeIcon(shape.type)
                const isSelected = shape.id === selectedId
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => setSelectedId(shape.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                      isSelected
                        ? 'bg-violet-500/20 border border-violet-500/30 text-violet-200'
                        : 'hover:bg-white/[0.04] text-violet-300/60 border border-transparent'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="truncate">
                      {shape.label || shapeLabel(shape.type)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteShape(shape.id)
                      }}
                      className="ml-auto p-0.5 rounded hover:bg-red-500/20 text-violet-400/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </button>
                )
              })}
            </div>

            {/* Add shape button + dropdown */}
            <div className="relative" ref={addMenuRef}>
              <button
                type="button"
                onClick={() => setShowAddMenu((v) => !v)}
                className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-violet-400/60 hover:text-violet-300 hover:bg-white/[0.04] border border-transparent transition-colors"
              >
                <Plus size={14} />
                <span>Forma</span>
              </button>

              {showAddMenu && (
                <div className="absolute bottom-full left-0 mb-1 w-52 bg-[#1e1334] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 z-10">
                  {SHAPE_TYPE_OPTIONS.map(({ type, label, Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addShape(type)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] text-violet-300/80 hover:text-violet-100 hover:bg-white/[0.06] transition-colors"
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
            {selectedShape ? (
              <ShapeConfigForm shape={selectedShape} onChange={updateShape} />
            ) : (
              <div className="flex items-center justify-center h-full text-violet-400/40 text-sm">
                Adicione uma forma para começar
              </div>
            )}
          </div>

          {/* Right panel – preview */}
          <div className="w-80 border-l border-white/[0.06] flex flex-col p-3 gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/40 mb-1">
              Pré-visualização
            </span>

            <div className="flex-1 min-h-0">
              <TikzPreview
                shapes={shapes}
                selectedId={selectedId ?? undefined}
                showGrid={showGrid}
                zoom={zoom}
                width={280}
                height={300}
              />
            </div>

            {/* Grid toggle + zoom controls */}
            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-1.5 text-[11px] text-violet-400/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="accent-violet-500"
                />
                Grade
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= 0.25}
                  className="p-1 rounded text-violet-400/60 hover:text-violet-200 hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <span className="text-xs font-bold leading-none">−</span>
                </button>
                <span className="text-[11px] text-violet-300/60 w-10 text-center tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= 4}
                  className="p-1 rounded text-violet-400/60 hover:text-violet-200 hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <span className="text-xs font-bold leading-none">+</span>
                </button>
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
              className="px-3 py-1.5 rounded-lg text-[12px] text-violet-300/60 hover:text-violet-200 hover:bg-white/[0.04] border border-transparent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={shapes.length === 0}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {isInsert ? 'Inserir' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
