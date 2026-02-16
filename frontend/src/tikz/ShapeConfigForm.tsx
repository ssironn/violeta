import { useState, useEffect } from 'react'
import {
  FieldLabel,
  FieldInput,
  FieldRow,
  FieldGroup,
} from '../components/math-editors/MathModalShell'
import type { TikzShape, TikzCustomPolygon } from './types'

/** Color picker with swatch preview */
function ColorPicker({
  value,
  onChange,
  allowNone = false,
}: {
  value: string
  onChange: (color: string) => void
  allowNone?: boolean
}) {
  const hasColor = value !== '' && value !== 'none'
  const displayColor = hasColor ? value : '#c4b5fd'

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className="w-8 h-8 rounded-lg border border-white/[0.12] cursor-pointer"
          style={{ backgroundColor: hasColor ? displayColor : 'transparent' }}
        >
          {!hasColor && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[1px] h-full bg-red-400/60 rotate-45 absolute" />
            </div>
          )}
        </div>
        <input
          type="color"
          value={displayColor}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-[11px] text-accent-300/60 font-mono">
        {hasColor ? value : 'nenhum'}
      </span>
      {allowNone && hasColor && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-[11px] text-accent-400/40 hover:text-red-400 transition-colors"
        >
          Limpar
        </button>
      )}
      {allowNone && !hasColor && (
        <button
          type="button"
          onClick={() => onChange('#c4b5fd')}
          className="text-[11px] text-accent-400/40 hover:text-accent-300 transition-colors"
        >
          Definir
        </button>
      )}
    </div>
  )
}

/** Numeric input that allows intermediate empty/partial values while editing */
function NumericInput({
  value,
  onChange,
  placeholder,
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
}) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  function handleChange(raw: string) {
    setText(raw)
    if (raw === '' || raw === '-' || raw === '.') return
    const n = parseFloat(raw)
    if (!isNaN(n)) onChange(n)
  }

  function handleBlur() {
    const n = parseFloat(text)
    if (isNaN(n) || text === '') {
      setText(String(value))
    }
  }

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-accent-100 placeholder:text-accent-400/30 focus:outline-none focus:border-accent-500/40 font-mono"
    />
  )
}

interface Props {
  shape: TikzShape
  onChange: (updated: TikzShape) => void
}

export function ShapeConfigForm({ shape, onChange }: Props) {
  function update(partial: Partial<TikzShape>) {
    onChange({ ...shape, ...partial } as TikzShape)
  }

  /* ── shape-specific fields ──────────────────────────────── */

  function renderShapeFields() {
    switch (shape.type) {
      case 'circle':
        return (
          <FieldGroup>
            <FieldLabel>Raio</FieldLabel>
            <NumericInput
              value={shape.radius}
              onChange={(n) => update({ radius: n })}
              placeholder="1"
            />
          </FieldGroup>
        )

      case 'rectangle':
        return (
          <FieldRow>
            <FieldGroup>
              <FieldLabel>Largura</FieldLabel>
              <NumericInput
                value={shape.width}
                onChange={(n) => update({ width: n })}
                placeholder="2"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Altura</FieldLabel>
              <NumericInput
                value={shape.height}
                onChange={(n) => update({ height: n })}
                placeholder="1"
              />
            </FieldGroup>
          </FieldRow>
        )

      case 'square':
        return (
          <FieldGroup>
            <FieldLabel>Lado</FieldLabel>
            <NumericInput
              value={shape.side}
              onChange={(n) => update({ side: n })}
              placeholder="1"
            />
          </FieldGroup>
        )

      case 'triangle':
        return (
          <FieldRow>
            <FieldGroup>
              <FieldLabel>Base</FieldLabel>
              <NumericInput
                value={shape.base}
                onChange={(n) => update({ base: n })}
                placeholder="2"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Altura</FieldLabel>
              <NumericInput
                value={shape.height}
                onChange={(n) => update({ height: n })}
                placeholder="1.5"
              />
            </FieldGroup>
          </FieldRow>
        )

      case 'regular-polygon':
        return (
          <FieldRow>
            <FieldGroup>
              <FieldLabel>Lados</FieldLabel>
              <NumericInput
                value={shape.sides}
                onChange={(n) => update({ sides: n })}
                placeholder="5"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Raio</FieldLabel>
              <NumericInput
                value={shape.radius}
                onChange={(n) => update({ radius: n })}
                placeholder="1"
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
              <span className="text-[11px] text-accent-400/60 w-4">{i + 1}.</span>
              <input
                type="text"
                value={v.x}
                onChange={(e) => updateVertex(i, 'x', e.target.value)}
                className="w-16 bg-black/20 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-accent-100 font-mono"
                placeholder="x"
              />
              <input
                type="text"
                value={v.y}
                onChange={(e) => updateVertex(i, 'y', e.target.value)}
                className="w-16 bg-black/20 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-accent-100 font-mono"
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
            className="text-[11px] text-accent-400/60 hover:text-accent-300 text-left mt-0.5"
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
            <NumericInput
              value={shape.position.x}
              onChange={(n) => update({ position: { ...shape.position, x: n } })}
              placeholder="0"
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Posição Y</FieldLabel>
            <NumericInput
              value={shape.position.y}
              onChange={(n) => update({ position: { ...shape.position, y: n } })}
              placeholder="0"
            />
          </FieldGroup>
        </FieldRow>

        {/* Colors */}
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Preenchimento</FieldLabel>
            <ColorPicker
              value={shape.fill ?? ''}
              onChange={(c) => update({ fill: c })}
              allowNone
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Contorno</FieldLabel>
            <ColorPicker
              value={shape.stroke ?? '#8b5cf6'}
              onChange={(c) => update({ stroke: c })}
            />
          </FieldGroup>
        </FieldRow>

        {/* Line width */}
        <FieldGroup>
          <FieldLabel>Espessura da linha</FieldLabel>
          <NumericInput
            value={shape.lineWidth ?? 0.4}
            onChange={(n) => update({ lineWidth: n })}
            placeholder="0.4"
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
                onClick={() => update({ lineStyle: ls.value })}
                className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
                  currentLineStyle === ls.value
                    ? 'bg-accent-500/20 border-accent-500/40 text-accent-200'
                    : 'bg-black/20 border-white/[0.08] text-accent-400/60 hover:text-accent-300'
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
            onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-accent-500"
          />
        </FieldGroup>

        {/* Rotation */}
        <FieldGroup>
          <FieldLabel>Rotação (graus)</FieldLabel>
          <NumericInput
            value={shape.rotation ?? 0}
            onChange={(n) => update({ rotation: n })}
            placeholder="0"
          />
        </FieldGroup>

        {/* Shadow */}
        <FieldGroup>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shape.shadow ?? false}
              onChange={(e) => update({ shadow: e.target.checked })}
              className="accent-accent-500"
            />
            <FieldLabel>Sombra</FieldLabel>
          </div>
        </FieldGroup>

        {/* Label */}
        <FieldGroup>
          <FieldLabel>Rótulo</FieldLabel>
          <FieldInput
            value={shape.label ?? ''}
            onChange={(v) => update({ label: v })}
            placeholder="Texto do rótulo"
          />
        </FieldGroup>
      </div>
    </div>
  )
}
