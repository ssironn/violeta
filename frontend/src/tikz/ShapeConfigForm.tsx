import {
  FieldLabel,
  FieldInput,
  FieldRow,
  FieldGroup,
} from '../components/math-editors/MathModalShell'
import type { TikzShape, TikzCustomPolygon } from './types'

interface Props {
  shape: TikzShape
  onChange: (updated: TikzShape) => void
}

export default function ShapeConfigForm({ shape, onChange }: Props) {
  function set<K extends keyof TikzShape>(key: K, value: TikzShape[K]) {
    onChange({ ...shape, [key]: value })
  }

  function setNum(key: string, raw: string) {
    const n = parseFloat(raw)
    if (!isNaN(n)) onChange({ ...shape, [key]: n } as TikzShape)
  }

  /* ── shape-specific fields ──────────────────────────────── */

  function renderShapeFields() {
    switch (shape.type) {
      case 'circle':
        return (
          <FieldGroup>
            <FieldLabel>Raio</FieldLabel>
            <FieldInput
              value={String(shape.radius)}
              onChange={(v) => setNum('radius', v)}
              placeholder="1"
              mono
            />
          </FieldGroup>
        )

      case 'rectangle':
        return (
          <FieldRow>
            <FieldGroup>
              <FieldLabel>Largura</FieldLabel>
              <FieldInput
                value={String(shape.width)}
                onChange={(v) => setNum('width', v)}
                placeholder="2"
                mono
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Altura</FieldLabel>
              <FieldInput
                value={String(shape.height)}
                onChange={(v) => setNum('height', v)}
                placeholder="1"
                mono
              />
            </FieldGroup>
          </FieldRow>
        )

      case 'square':
        return (
          <FieldGroup>
            <FieldLabel>Lado</FieldLabel>
            <FieldInput
              value={String(shape.side)}
              onChange={(v) => setNum('side', v)}
              placeholder="1"
              mono
            />
          </FieldGroup>
        )

      case 'triangle':
        return (
          <FieldRow>
            <FieldGroup>
              <FieldLabel>Base</FieldLabel>
              <FieldInput
                value={String(shape.base)}
                onChange={(v) => setNum('base', v)}
                placeholder="2"
                mono
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Altura</FieldLabel>
              <FieldInput
                value={String(shape.height)}
                onChange={(v) => setNum('height', v)}
                placeholder="1.5"
                mono
              />
            </FieldGroup>
          </FieldRow>
        )

      case 'regular-polygon':
        return (
          <FieldRow>
            <FieldGroup>
              <FieldLabel>Lados</FieldLabel>
              <FieldInput
                value={String(shape.sides)}
                onChange={(v) => setNum('sides', v)}
                placeholder="5"
                mono
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Raio</FieldLabel>
              <FieldInput
                value={String(shape.radius)}
                onChange={(v) => setNum('radius', v)}
                placeholder="1"
                mono
              />
            </FieldGroup>
          </FieldRow>
        )

      case 'custom-polygon':
        return renderCustomPolygonFields(shape)
    }
  }

  function renderCustomPolygonFields(poly: TikzCustomPolygon) {
    function updateVertex(i: number, axis: 'x' | 'y', raw: string) {
      const n = parseFloat(raw)
      if (isNaN(n)) return
      const vertices = poly.vertices.map((v, idx) =>
        idx === i ? { ...v, [axis]: n } : v,
      )
      onChange({ ...poly, vertices })
    }

    function removeVertex(i: number) {
      if (poly.vertices.length <= 3) return
      onChange({ ...poly, vertices: poly.vertices.filter((_, idx) => idx !== i) })
    }

    function addVertex() {
      onChange({ ...poly, vertices: [...poly.vertices, { x: 0, y: 0 }] })
    }

    return (
      <FieldGroup>
        <FieldLabel>Vértices</FieldLabel>
        <div className="flex flex-col gap-1.5">
          {poly.vertices.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-violet-400/60 w-4">{i + 1}.</span>
              <input
                type="text"
                value={v.x}
                onChange={(e) => updateVertex(i, 'x', e.target.value)}
                className="w-16 bg-black/20 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-violet-100 font-mono"
                placeholder="x"
              />
              <input
                type="text"
                value={v.y}
                onChange={(e) => updateVertex(i, 'y', e.target.value)}
                className="w-16 bg-black/20 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-violet-100 font-mono"
                placeholder="y"
              />
              {poly.vertices.length > 3 && (
                <button
                  type="button"
                  onClick={() => removeVertex(i)}
                  className="text-red-400/60 hover:text-red-400 text-[11px]"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addVertex}
            className="text-[11px] text-violet-400/60 hover:text-violet-300 text-left mt-0.5"
          >
            + Adicionar vértice
          </button>
        </div>
      </FieldGroup>
    )
  }

  /* ── line style toggles ─────────────────────────────────── */

  const lineStyles: { value: 'solid' | 'dashed' | 'dotted'; label: string }[] = [
    { value: 'solid', label: 'Sólido' },
    { value: 'dashed', label: 'Tracejado' },
    { value: 'dotted', label: 'Pontilhado' },
  ]

  const currentLineStyle = shape.lineStyle ?? 'solid'

  /* ── render ─────────────────────────────────────────────── */

  return (
    <div className="max-h-[400px] overflow-y-auto flex flex-col gap-3">
      {/* Shape-specific fields */}
      {renderShapeFields()}

      {/* ── separator ── */}
      <div className="border-t border-white/[0.06] pt-3 mt-3 flex flex-col gap-3">
        {/* Position */}
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Posição X</FieldLabel>
            <FieldInput
              value={String(shape.position.x)}
              onChange={(v) => {
                const n = parseFloat(v)
                if (!isNaN(n)) set('position', { ...shape.position, x: n })
              }}
              placeholder="0"
              mono
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Posição Y</FieldLabel>
            <FieldInput
              value={String(shape.position.y)}
              onChange={(v) => {
                const n = parseFloat(v)
                if (!isNaN(n)) set('position', { ...shape.position, y: n })
              }}
              placeholder="0"
              mono
            />
          </FieldGroup>
        </FieldRow>

        {/* Colors */}
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Preenchimento</FieldLabel>
            <FieldInput
              value={shape.fill ?? ''}
              onChange={(v) => set('fill', v)}
              placeholder="none"
              mono
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Contorno</FieldLabel>
            <FieldInput
              value={shape.stroke ?? ''}
              onChange={(v) => set('stroke', v)}
              placeholder="black"
              mono
            />
          </FieldGroup>
        </FieldRow>

        {/* Line width */}
        <FieldGroup>
          <FieldLabel>Espessura da linha</FieldLabel>
          <FieldInput
            value={String(shape.lineWidth ?? 0.4)}
            onChange={(v) => setNum('lineWidth', v)}
            placeholder="0.4"
            mono
          />
        </FieldGroup>

        {/* Line style toggles */}
        <FieldGroup>
          <FieldLabel>Estilo da linha</FieldLabel>
          <div className="flex gap-1.5">
            {lineStyles.map((ls) => (
              <button
                key={ls.value}
                type="button"
                onClick={() => set('lineStyle', ls.value)}
                className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
                  currentLineStyle === ls.value
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
                    : 'bg-black/20 border-white/[0.08] text-violet-400/60 hover:text-violet-300'
                }`}
              >
                {ls.label}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Opacity */}
        <FieldGroup>
          <FieldLabel>Opacidade</FieldLabel>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={shape.opacity ?? 1}
            onChange={(e) => setNum('opacity', e.target.value)}
            className="w-full accent-violet-500"
          />
        </FieldGroup>

        {/* Rotation */}
        <FieldGroup>
          <FieldLabel>Rotação (graus)</FieldLabel>
          <FieldInput
            value={String(shape.rotation ?? 0)}
            onChange={(v) => setNum('rotation', v)}
            placeholder="0"
            mono
          />
        </FieldGroup>

        {/* Shadow */}
        <FieldGroup>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shape.shadow ?? false}
              onChange={(e) => set('shadow', e.target.checked)}
              className="accent-violet-500"
            />
            <FieldLabel>Sombra</FieldLabel>
          </div>
        </FieldGroup>

        {/* Label */}
        <FieldGroup>
          <FieldLabel>Rótulo</FieldLabel>
          <FieldInput
            value={shape.label ?? ''}
            onChange={(v) => set('label', v)}
            placeholder="Texto do rótulo"
          />
        </FieldGroup>
      </div>
    </div>
  )
}
