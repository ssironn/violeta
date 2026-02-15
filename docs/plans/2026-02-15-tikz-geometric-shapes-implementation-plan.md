# TikZ Geometric Shapes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to create geometric figures (circles, rectangles, squares, triangles, regular/custom polygons) via a visual modal that generates TikZ code automatically.

**Architecture:** A dedicated modal (`TikzShapeEditor`) with 3 panels (shape list, config form, SVG preview). Shapes stored as JSON attrs in a new `tikzFigure` TipTap node. Pure functions convert shapes to TikZ code. SVG preview renders shapes in real-time.

**Tech Stack:** React + TypeScript, TipTap extension, SVG for preview, TailwindCSS for styling.

---

### Task 1: TikZ Types & Generator

**Files:**
- Create: `frontend/src/tikz/types.ts`
- Create: `frontend/src/tikz/tikzGenerator.ts`

**Step 1: Create the types file**

Create `frontend/src/tikz/types.ts`:

```typescript
export type ShapeType = 'circle' | 'rectangle' | 'square' | 'triangle' | 'regular-polygon' | 'custom-polygon'

export interface TikzShapeBase {
  id: string
  type: ShapeType
  position: { x: number; y: number }
  fill?: string
  stroke?: string
  lineWidth?: number
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  opacity?: number
  rotation?: number
  shadow?: boolean
  label?: string
}

export interface TikzCircle extends TikzShapeBase {
  type: 'circle'
  radius: number
}

export interface TikzRectangle extends TikzShapeBase {
  type: 'rectangle'
  width: number
  height: number
}

export interface TikzSquare extends TikzShapeBase {
  type: 'square'
  side: number
}

export interface TikzTriangle extends TikzShapeBase {
  type: 'triangle'
  base: number
  height: number
}

export interface TikzRegularPolygon extends TikzShapeBase {
  type: 'regular-polygon'
  sides: number
  radius: number
}

export interface TikzCustomPolygon extends TikzShapeBase {
  type: 'custom-polygon'
  vertices: { x: number; y: number }[]
}

export type TikzShape = TikzCircle | TikzRectangle | TikzSquare
  | TikzTriangle | TikzRegularPolygon | TikzCustomPolygon

export function createDefaultShape(type: ShapeType): TikzShape {
  const base = {
    id: crypto.randomUUID(),
    position: { x: 0, y: 0 },
    fill: '',
    stroke: 'black',
    lineWidth: 0.4,
    lineStyle: 'solid' as const,
    opacity: 1,
    rotation: 0,
    shadow: false,
    label: '',
  }
  switch (type) {
    case 'circle': return { ...base, type: 'circle', radius: 1 }
    case 'rectangle': return { ...base, type: 'rectangle', width: 2, height: 1 }
    case 'square': return { ...base, type: 'square', side: 1 }
    case 'triangle': return { ...base, type: 'triangle', base: 2, height: 1.5 }
    case 'regular-polygon': return { ...base, type: 'regular-polygon', sides: 5, radius: 1 }
    case 'custom-polygon': return { ...base, type: 'custom-polygon', vertices: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 0 }] }
  }
}
```

**Step 2: Create the TikZ generator**

Create `frontend/src/tikz/tikzGenerator.ts`:

```typescript
import type { TikzShape } from './types'

function buildOptions(shape: TikzShape): string {
  const opts: string[] = []
  if (shape.fill) opts.push(`fill=${shape.fill}`)
  if (shape.stroke && shape.stroke !== 'black') opts.push(`draw=${shape.stroke}`)
  else opts.push('draw')
  if (shape.lineWidth && shape.lineWidth !== 0.4) opts.push(`line width=${shape.lineWidth}pt`)
  if (shape.lineStyle === 'dashed') opts.push('dashed')
  if (shape.lineStyle === 'dotted') opts.push('dotted')
  if (shape.opacity !== undefined && shape.opacity < 1) opts.push(`opacity=${shape.opacity}`)
  if (shape.rotation) opts.push(`rotate=${shape.rotation}`)
  if (shape.shadow) opts.push('drop shadow')
  return opts.join(', ')
}

function generateShapeTikz(shape: TikzShape): string {
  const opts = buildOptions(shape)
  const { x, y } = shape.position
  const labelNode = shape.label ? ` node {${shape.label}}` : ''

  switch (shape.type) {
    case 'circle':
      return `  \\draw[${opts}] (${x},${y}) circle (${shape.radius}cm)${labelNode};`

    case 'rectangle': {
      const x2 = x + shape.width
      const y2 = y + shape.height
      return `  \\draw[${opts}] (${x},${y}) rectangle (${x2},${y2})${labelNode};`
    }

    case 'square': {
      const x2 = x + shape.side
      const y2 = y + shape.side
      return `  \\draw[${opts}] (${x},${y}) rectangle (${x2},${y2})${labelNode};`
    }

    case 'triangle': {
      const x1 = x
      const y1 = y
      const x2 = x + shape.base / 2
      const y2 = y + shape.height
      const x3 = x + shape.base
      const y3 = y
      return `  \\draw[${opts}] (${x1},${y1}) -- (${x2},${y2}) -- (${x3},${y3}) -- cycle${labelNode};`
    }

    case 'regular-polygon':
      return `  \\node[regular polygon, regular polygon sides=${shape.sides}, minimum size=${shape.radius * 2}cm, ${opts}] at (${x},${y}) {${shape.label || ''}};`

    case 'custom-polygon': {
      const points = shape.vertices.map(v => `(${v.x},${v.y})`).join(' -- ')
      return `  \\draw[${opts}] ${points} -- cycle${labelNode};`
    }
  }
}

export function generateTikzCode(shapes: TikzShape[]): string {
  if (shapes.length === 0) return '\\begin{tikzpicture}\n\\end{tikzpicture}'
  const lines = shapes.map(generateShapeTikz)
  return `\\begin{tikzpicture}\n${lines.join('\n')}\n\\end{tikzpicture}`
}

export function generateTikzInner(shapes: TikzShape[]): string {
  return shapes.map(generateShapeTikz).join('\n')
}
```

**Step 3: Commit**

```bash
git add frontend/src/tikz/types.ts frontend/src/tikz/tikzGenerator.ts
git commit -m "feat(tikz): add shape types and TikZ code generator"
```

---

### Task 2: TikZ Color Utility & SVG Preview Component

**Files:**
- Create: `frontend/src/tikz/tikzColorToCSS.ts`
- Create: `frontend/src/tikz/TikzPreview.tsx`

**Step 1: Create the color converter**

Create `frontend/src/tikz/tikzColorToCSS.ts`:

```typescript
const TIKZ_BASE_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  yellow: '#ffff00',
  orange: '#ff8000',
  violet: '#8000ff',
  purple: '#800080',
  brown: '#804000',
  gray: '#808080',
  darkgray: '#404040',
  lightgray: '#c0c0c0',
  lime: '#80ff00',
  olive: '#808000',
  pink: '#ffb0b0',
  teal: '#008080',
}

export function tikzColorToCSS(tikzColor: string): string {
  if (!tikzColor) return 'none'
  const trimmed = tikzColor.trim()

  // Handle "color!intensity" (e.g., "blue!30")
  const bangMatch = trimmed.match(/^(\w+)!(\d+)$/)
  if (bangMatch) {
    const base = TIKZ_BASE_COLORS[bangMatch[1]] ?? '#000000'
    const intensity = parseInt(bangMatch[2]) / 100
    return hexToRgba(base, intensity)
  }

  // Handle "color!intensity!mixcolor" (e.g., "blue!30!white")
  const mixMatch = trimmed.match(/^(\w+)!(\d+)!(\w+)$/)
  if (mixMatch) {
    const color1 = TIKZ_BASE_COLORS[mixMatch[1]] ?? '#000000'
    const intensity = parseInt(mixMatch[2]) / 100
    const color2 = TIKZ_BASE_COLORS[mixMatch[3]] ?? '#ffffff'
    return mixColors(color1, color2, intensity)
  }

  // Plain color name
  return TIKZ_BASE_COLORS[trimmed] ?? trimmed
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function mixColors(hex1: string, hex2: string, ratio: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16)
  const g1 = parseInt(hex1.slice(3, 5), 16)
  const b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16)
  const g2 = parseInt(hex2.slice(3, 5), 16)
  const b2 = parseInt(hex2.slice(5, 7), 16)
  const r = Math.round(r1 * ratio + r2 * (1 - ratio))
  const g = Math.round(g1 * ratio + g2 * (1 - ratio))
  const b = Math.round(b1 * ratio + b2 * (1 - ratio))
  return `rgb(${r},${g},${b})`
}
```

**Step 2: Create the SVG preview component**

Create `frontend/src/tikz/TikzPreview.tsx`:

```typescript
import { useMemo } from 'react'
import type { TikzShape } from './types'
import { tikzColorToCSS } from './tikzColorToCSS'

interface TikzPreviewProps {
  shapes: TikzShape[]
  selectedId?: string
  showGrid?: boolean
  zoom?: number
  width?: number
  height?: number
}

const SCALE = 40 // 1 TikZ unit = 40px

function shapeToSvgStyle(shape: TikzShape) {
  return {
    fill: shape.fill ? tikzColorToCSS(shape.fill) : 'none',
    stroke: tikzColorToCSS(shape.stroke || 'black'),
    strokeWidth: (shape.lineWidth ?? 0.4) * 2,
    strokeDasharray: shape.lineStyle === 'dashed' ? '8,4' : shape.lineStyle === 'dotted' ? '2,3' : undefined,
    opacity: shape.opacity ?? 1,
  }
}

function toSvgX(x: number) { return x * SCALE }
function toSvgY(y: number) { return -y * SCALE } // TikZ Y is up, SVG Y is down

function renderShape(shape: TikzShape, isSelected: boolean) {
  const style = shapeToSvgStyle(shape)
  const rotation = shape.rotation ? `rotate(${-shape.rotation}, ${toSvgX(shape.position.x)}, ${toSvgY(shape.position.y)})` : undefined

  const selectionStroke = isSelected ? { stroke: '#a78bfa', strokeWidth: 2, strokeDasharray: '4,2' } : {}

  switch (shape.type) {
    case 'circle':
      return (
        <g key={shape.id} transform={rotation}>
          <circle cx={toSvgX(shape.position.x)} cy={toSvgY(shape.position.y)} r={shape.radius * SCALE} {...style} />
          {isSelected && <circle cx={toSvgX(shape.position.x)} cy={toSvgY(shape.position.y)} r={shape.radius * SCALE + 4} fill="none" {...selectionStroke} />}
          {shape.label && <text x={toSvgX(shape.position.x)} y={toSvgY(shape.position.y)} textAnchor="middle" dominantBaseline="central" fontSize={12} fill={tikzColorToCSS(shape.stroke || 'black')}>{shape.label}</text>}
        </g>
      )

    case 'rectangle': {
      const x = toSvgX(shape.position.x)
      const y = toSvgY(shape.position.y + shape.height)
      const w = shape.width * SCALE
      const h = shape.height * SCALE
      return (
        <g key={shape.id} transform={rotation}>
          <rect x={x} y={y} width={w} height={h} {...style} />
          {isSelected && <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" {...selectionStroke} />}
          {shape.label && <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={12}>{shape.label}</text>}
        </g>
      )
    }

    case 'square': {
      const x = toSvgX(shape.position.x)
      const y = toSvgY(shape.position.y + shape.side)
      const s = shape.side * SCALE
      return (
        <g key={shape.id} transform={rotation}>
          <rect x={x} y={y} width={s} height={s} {...style} />
          {isSelected && <rect x={x - 3} y={y - 3} width={s + 6} height={s + 6} fill="none" {...selectionStroke} />}
          {shape.label && <text x={x + s / 2} y={y + s / 2} textAnchor="middle" dominantBaseline="central" fontSize={12}>{shape.label}</text>}
        </g>
      )
    }

    case 'triangle': {
      const x1 = toSvgX(shape.position.x)
      const y1 = toSvgY(shape.position.y)
      const x2 = toSvgX(shape.position.x + shape.base / 2)
      const y2 = toSvgY(shape.position.y + shape.height)
      const x3 = toSvgX(shape.position.x + shape.base)
      const y3 = toSvgY(shape.position.y)
      const points = `${x1},${y1} ${x2},${y2} ${x3},${y3}`
      return (
        <g key={shape.id} transform={rotation}>
          <polygon points={points} {...style} />
          {shape.label && <text x={(x1 + x2 + x3) / 3} y={(y1 + y2 + y3) / 3} textAnchor="middle" dominantBaseline="central" fontSize={12}>{shape.label}</text>}
        </g>
      )
    }

    case 'regular-polygon': {
      const cx = toSvgX(shape.position.x)
      const cy = toSvgY(shape.position.y)
      const r = shape.radius * SCALE
      const pts = Array.from({ length: shape.sides }, (_, i) => {
        const angle = (2 * Math.PI * i) / shape.sides - Math.PI / 2
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
      }).join(' ')
      return (
        <g key={shape.id} transform={rotation}>
          <polygon points={pts} {...style} />
          {shape.label && <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={12}>{shape.label}</text>}
        </g>
      )
    }

    case 'custom-polygon': {
      const pts = shape.vertices.map(v => `${toSvgX(v.x)},${toSvgY(v.y)}`).join(' ')
      return (
        <g key={shape.id} transform={rotation}>
          <polygon points={pts} {...style} />
          {shape.label && (() => {
            const cx = shape.vertices.reduce((s, v) => s + toSvgX(v.x), 0) / shape.vertices.length
            const cy = shape.vertices.reduce((s, v) => s + toSvgY(v.y), 0) / shape.vertices.length
            return <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={12}>{shape.label}</text>
          })()}
        </g>
      )
    }
  }
}

export function TikzPreview({ shapes, selectedId, showGrid = true, zoom = 1, width = 320, height = 240 }: TikzPreviewProps) {
  const bounds = useMemo(() => {
    if (shapes.length === 0) return { minX: -3, maxX: 3, minY: -2, maxY: 2 }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const s of shapes) {
      const { x, y } = s.position
      minX = Math.min(minX, x - 3)
      maxX = Math.max(maxX, x + 3)
      minY = Math.min(minY, y - 3)
      maxY = Math.max(maxY, y + 3)
    }
    return { minX, maxX, minY, maxY }
  }, [shapes])

  const viewMinX = bounds.minX * SCALE
  const viewMinY = -bounds.maxY * SCALE
  const viewW = (bounds.maxX - bounds.minX) * SCALE
  const viewH = (bounds.maxY - bounds.minY) * SCALE

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${viewMinX / zoom} ${viewMinY / zoom} ${viewW / zoom} ${viewH / zoom}`}
      className="bg-black/20 rounded-xl border border-white/[0.06]"
    >
      {showGrid && (
        <g opacity={0.15}>
          {Array.from({ length: Math.ceil(bounds.maxX - bounds.minX) + 1 }, (_, i) => {
            const x = toSvgX(Math.floor(bounds.minX) + i)
            return <line key={`v${i}`} x1={x} y1={viewMinY} x2={x} y2={viewMinY + viewH} stroke="#a78bfa" strokeWidth={0.5} />
          })}
          {Array.from({ length: Math.ceil(bounds.maxY - bounds.minY) + 1 }, (_, i) => {
            const y = toSvgY(Math.floor(bounds.minY) + i)
            return <line key={`h${i}`} x1={viewMinX} y1={y} x2={viewMinX + viewW} y2={y} stroke="#a78bfa" strokeWidth={0.5} />
          })}
          {/* Axes */}
          <line x1={viewMinX} y1={0} x2={viewMinX + viewW} y2={0} stroke="#a78bfa" strokeWidth={1} />
          <line x1={0} y1={viewMinY} x2={0} y2={viewMinY + viewH} stroke="#a78bfa" strokeWidth={1} />
        </g>
      )}
      {shapes.map(s => renderShape(s, s.id === selectedId))}
    </svg>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/src/tikz/tikzColorToCSS.ts frontend/src/tikz/TikzPreview.tsx
git commit -m "feat(tikz): add color converter and SVG preview component"
```

---

### Task 3: Shape Configuration Form Component

**Files:**
- Create: `frontend/src/tikz/ShapeConfigForm.tsx`

**Step 1: Create the form component**

Create `frontend/src/tikz/ShapeConfigForm.tsx`. This renders dynamic form fields depending on the selected shape type. It uses `FieldLabel`, `FieldInput`, `FieldRow`, `FieldGroup` from `MathModalShell.tsx` for consistency.

```typescript
import type { TikzShape, ShapeType } from './types'
import { FieldLabel, FieldInput, FieldRow, FieldGroup } from '../components/math-editors/MathModalShell'

interface ShapeConfigFormProps {
  shape: TikzShape
  onChange: (updated: TikzShape) => void
}

const SHAPE_LABELS: Record<ShapeType, string> = {
  'circle': 'Círculo',
  'rectangle': 'Retângulo',
  'square': 'Quadrado',
  'triangle': 'Triângulo',
  'regular-polygon': 'Polígono regular',
  'custom-polygon': 'Polígono personalizado',
}

export function ShapeConfigForm({ shape, onChange }: ShapeConfigFormProps) {
  function update(partial: Partial<TikzShape>) {
    onChange({ ...shape, ...partial } as TikzShape)
  }

  function updatePosition(axis: 'x' | 'y', value: string) {
    const num = parseFloat(value) || 0
    update({ position: { ...shape.position, [axis]: num } })
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
      {/* Shape-specific fields */}
      {shape.type === 'circle' && (
        <FieldGroup>
          <FieldLabel>Raio (cm)</FieldLabel>
          <FieldInput value={String(shape.radius)} onChange={v => update({ radius: parseFloat(v) || 0 } as any)} placeholder="1" />
        </FieldGroup>
      )}

      {shape.type === 'rectangle' && (
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Largura (cm)</FieldLabel>
            <FieldInput value={String(shape.width)} onChange={v => update({ width: parseFloat(v) || 0 } as any)} placeholder="2" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Altura (cm)</FieldLabel>
            <FieldInput value={String(shape.height)} onChange={v => update({ height: parseFloat(v) || 0 } as any)} placeholder="1" />
          </FieldGroup>
        </FieldRow>
      )}

      {shape.type === 'square' && (
        <FieldGroup>
          <FieldLabel>Lado (cm)</FieldLabel>
          <FieldInput value={String(shape.side)} onChange={v => update({ side: parseFloat(v) || 0 } as any)} placeholder="1" />
        </FieldGroup>
      )}

      {shape.type === 'triangle' && (
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Base (cm)</FieldLabel>
            <FieldInput value={String(shape.base)} onChange={v => update({ base: parseFloat(v) || 0 } as any)} placeholder="2" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Altura (cm)</FieldLabel>
            <FieldInput value={String(shape.height)} onChange={v => update({ height: parseFloat(v) || 0 } as any)} placeholder="1.5" />
          </FieldGroup>
        </FieldRow>
      )}

      {shape.type === 'regular-polygon' && (
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Lados</FieldLabel>
            <FieldInput value={String(shape.sides)} onChange={v => update({ sides: Math.max(3, parseInt(v) || 3) } as any)} placeholder="5" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Raio (cm)</FieldLabel>
            <FieldInput value={String(shape.radius)} onChange={v => update({ radius: parseFloat(v) || 0 } as any)} placeholder="1" />
          </FieldGroup>
        </FieldRow>
      )}

      {shape.type === 'custom-polygon' && (
        <div>
          <FieldLabel>Vértices</FieldLabel>
          {shape.vertices.map((v, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] text-violet-300/50 w-4">{i + 1}</span>
              <input
                type="text"
                value={String(v.x)}
                onChange={e => {
                  const verts = [...shape.vertices]
                  verts[i] = { ...verts[i], x: parseFloat(e.target.value) || 0 }
                  update({ vertices: verts } as any)
                }}
                className="w-16 bg-black/20 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-violet-100 font-mono focus:outline-none focus:border-violet-500/50"
                placeholder="x"
              />
              <input
                type="text"
                value={String(v.y)}
                onChange={e => {
                  const verts = [...shape.vertices]
                  verts[i] = { ...verts[i], y: parseFloat(e.target.value) || 0 }
                  update({ vertices: verts } as any)
                }}
                className="w-16 bg-black/20 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-violet-100 font-mono focus:outline-none focus:border-violet-500/50"
                placeholder="y"
              />
              {shape.vertices.length > 3 && (
                <button
                  onClick={() => {
                    const verts = shape.vertices.filter((_, j) => j !== i)
                    update({ vertices: verts } as any)
                  }}
                  className="text-red-400/60 hover:text-red-400 text-[11px]"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => update({ vertices: [...shape.vertices, { x: 0, y: 0 }] } as any)}
            className="text-[11px] text-violet-400/60 hover:text-violet-300 mt-1"
          >
            + Vértice
          </button>
        </div>
      )}

      {/* Common fields */}
      <div className="border-t border-white/[0.06] pt-3 mt-3">
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Posição X</FieldLabel>
            <FieldInput value={String(shape.position.x)} onChange={v => updatePosition('x', v)} placeholder="0" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Posição Y</FieldLabel>
            <FieldInput value={String(shape.position.y)} onChange={v => updatePosition('y', v)} placeholder="0" />
          </FieldGroup>
        </FieldRow>
      </div>

      <FieldRow>
        <FieldGroup>
          <FieldLabel>Preenchimento</FieldLabel>
          <FieldInput value={shape.fill || ''} onChange={v => update({ fill: v })} placeholder="blue!30" mono />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Borda</FieldLabel>
          <FieldInput value={shape.stroke || ''} onChange={v => update({ stroke: v })} placeholder="black" mono />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup>
          <FieldLabel>Espessura (pt)</FieldLabel>
          <FieldInput value={String(shape.lineWidth ?? 0.4)} onChange={v => update({ lineWidth: parseFloat(v) || 0.4 })} placeholder="0.4" />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Estilo da linha</FieldLabel>
          <div className="flex gap-2 mt-1">
            {(['solid', 'dashed', 'dotted'] as const).map(s => (
              <button
                key={s}
                onClick={() => update({ lineStyle: s })}
                className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                  shape.lineStyle === s
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
                    : 'bg-black/20 border-white/[0.08] text-violet-400/60 hover:text-violet-300'
                }`}
              >
                {s === 'solid' ? 'Sólido' : s === 'dashed' ? 'Tracejado' : 'Pontilhado'}
              </button>
            ))}
          </div>
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup>
          <FieldLabel>Opacidade</FieldLabel>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={shape.opacity ?? 1}
            onChange={e => update({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-violet-500"
          />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Rotação (°)</FieldLabel>
          <FieldInput value={String(shape.rotation ?? 0)} onChange={v => update({ rotation: parseFloat(v) || 0 })} placeholder="0" />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup>
          <FieldLabel>Sombra</FieldLabel>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={shape.shadow ?? false}
              onChange={e => update({ shadow: e.target.checked })}
              className="accent-violet-500"
            />
            <span className="text-[12px] text-violet-200/70">Ativar sombra</span>
          </label>
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Rótulo</FieldLabel>
          <FieldInput value={shape.label || ''} onChange={v => update({ label: v })} placeholder="Texto" mono={false} />
        </FieldGroup>
      </FieldRow>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/tikz/ShapeConfigForm.tsx
git commit -m "feat(tikz): add shape configuration form component"
```

---

### Task 4: TikzShapeEditor Modal

**Files:**
- Create: `frontend/src/tikz/TikzShapeEditor.tsx`

**Step 1: Create the main modal component**

Create `frontend/src/tikz/TikzShapeEditor.tsx`. This is the main 3-panel modal: shape list (left), config form (center), SVG preview (right).

```typescript
import { useState } from 'react'
import { X, Plus, Trash2, Circle, Square, Triangle, Pentagon, Hexagon } from 'lucide-react'
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

const SHAPE_TYPES: { type: ShapeType; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { type: 'circle', label: 'Círculo', icon: Circle },
  { type: 'square', label: 'Quadrado', icon: Square },
  { type: 'rectangle', label: 'Retângulo', icon: Square },
  { type: 'triangle', label: 'Triângulo', icon: Triangle },
  { type: 'regular-polygon', label: 'Polígono regular', icon: Pentagon },
  { type: 'custom-polygon', label: 'Polígono personalizado', icon: Hexagon },
]

const SHAPE_ICONS: Record<ShapeType, React.ComponentType<{ size?: number; className?: string }>> = {
  'circle': Circle,
  'square': Square,
  'rectangle': Square,
  'triangle': Triangle,
  'regular-polygon': Pentagon,
  'custom-polygon': Hexagon,
}

const SHAPE_SHORT_LABELS: Record<ShapeType, string> = {
  'circle': 'Círculo',
  'rectangle': 'Retângulo',
  'square': 'Quadrado',
  'triangle': 'Triângulo',
  'regular-polygon': 'Polígono',
  'custom-polygon': 'Polígono',
}

export function TikzShapeEditor({ initialShapes, onSave, onDelete, onClose, isInsert }: TikzShapeEditorProps) {
  const [shapes, setShapes] = useState<TikzShape[]>(initialShapes)
  const [selectedId, setSelectedId] = useState<string | null>(initialShapes[0]?.id ?? null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(1)

  const selectedShape = shapes.find(s => s.id === selectedId) ?? null

  function addShape(type: ShapeType) {
    const newShape = createDefaultShape(type)
    setShapes([...shapes, newShape])
    setSelectedId(newShape.id)
    setShowAddMenu(false)
  }

  function removeShape(id: string) {
    const next = shapes.filter(s => s.id !== id)
    setShapes(next)
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null)
    }
  }

  function updateShape(updated: TikzShape) {
    setShapes(shapes.map(s => s.id === updated.id ? updated : s))
  }

  function handleSave() {
    const tikz = generateTikzCode(shapes)
    onSave(tikz, shapes)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative border border-surface-border rounded-2xl shadow-[0_24px_80px_rgba(88,28,135,0.3)] overflow-hidden w-full max-w-4xl mx-4"
        style={{ background: 'linear-gradient(170deg, #2a1842 0%, #1a1028 40%, #150d22 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <h3 className="text-[13px] font-semibold tracking-wide text-violet-200 uppercase">
            Construtor de Figuras TikZ
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* 3-panel body */}
        <div className="flex min-h-[420px]">
          {/* Left: Shape list */}
          <div className="w-44 border-r border-white/[0.06] p-3 flex flex-col gap-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/40 mb-1">Formas</div>
            {shapes.map((s, i) => {
              const Icon = SHAPE_ICONS[s.type]
              const isSelected = s.id === selectedId
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition-all text-[12px] ${
                    isSelected
                      ? 'bg-violet-500/20 border border-violet-500/30 text-violet-200'
                      : 'hover:bg-white/[0.04] text-violet-300/60 border border-transparent'
                  }`}
                >
                  <Icon size={14} />
                  <span className="truncate">{SHAPE_SHORT_LABELS[s.type]} {i + 1}</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeShape(s.id) }}
                    className="ml-auto p-0.5 rounded hover:bg-red-500/20 text-violet-400/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </button>
              )
            })}
            <div className="relative mt-1">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 text-[12px] text-violet-400/50 hover:text-violet-300 hover:bg-white/[0.04] transition-all"
              >
                <Plus size={14} />
                <span>Forma</span>
              </button>
              {showAddMenu && (
                <div className="absolute left-0 top-full mt-1 z-10 bg-[#1e1334] border border-white/[0.08] rounded-xl shadow-2xl py-1 w-52">
                  {SHAPE_TYPES.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => addShape(type)}
                      className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-white/[0.05] text-[12px] text-violet-200/70 transition-colors"
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Config form */}
          <div className="flex-1 p-4 border-r border-white/[0.06]">
            {selectedShape ? (
              <>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/40 mb-3">Configuração</div>
                <ShapeConfigForm shape={selectedShape} onChange={updateShape} />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-violet-400/30 text-[13px]">
                Adicione uma forma para começar
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="w-80 p-4 flex flex-col gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/40 mb-1">Preview</div>
            <TikzPreview
              shapes={shapes}
              selectedId={selectedId ?? undefined}
              showGrid={showGrid}
              zoom={zoom}
              width={280}
              height={280}
            />
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="accent-violet-500" />
                <span className="text-[11px] text-violet-300/60">Grid</span>
              </label>
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="px-1.5 py-0.5 text-[11px] text-violet-300/60 hover:text-violet-200 bg-black/20 rounded border border-white/[0.06]">−</button>
                <span className="text-[11px] text-violet-300/60 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="px-1.5 py-0.5 text-[11px] text-violet-300/60 hover:text-violet-200 bg-black/20 rounded border border-white/[0.06]">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-black/10">
          {isInsert ? <div /> : (
            <button onClick={onDelete} className="px-3 py-1.5 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium">
              Remover
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] rounded-lg transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={shapes.length === 0}
              className="px-5 py-1.5 text-[13px] font-semibold bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isInsert ? 'Inserir' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/tikz/TikzShapeEditor.tsx
git commit -m "feat(tikz): add TikzShapeEditor modal with 3-panel layout"
```

---

### Task 5: TipTap Extension — TikzFigureBlock

**Files:**
- Create: `frontend/src/extensions/TikzFigureBlock.ts`
- Modify: `frontend/src/hooks/useVioletaEditor.ts` — register the extension

**Step 1: Create the TipTap extension**

Create `frontend/src/extensions/TikzFigureBlock.ts`:

```typescript
import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tikzFigure: {
      insertTikzFigure: (attrs: { tikzCode: string; shapes: any[] }) => ReturnType
      updateTikzFigure: (attrs: { tikzCode: string; shapes: any[]; pos: number }) => ReturnType
      deleteTikzFigure: (attrs: { pos: number }) => ReturnType
    }
  }
}

export const TikzFigureBlock = Node.create({
  name: 'tikzFigure',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      tikzCode: { default: '' },
      shapes: { default: [] },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tikz-figure"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tikz-figure' })]
  },

  addCommands() {
    return {
      insertTikzFigure:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs })
        },
      updateTikzFigure:
        ({ tikzCode, shapes, pos }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, { tikzCode, shapes })
          }
          return true
        },
      deleteTikzFigure:
        ({ pos }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const node = tr.doc.nodeAt(pos)
            if (node) tr.delete(pos, pos + node.nodeSize)
          }
          return true
        },
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.className = 'tikz-figure-block my-3 cursor-pointer group'
      dom.setAttribute('data-type', 'tikz-figure')

      const render = () => {
        const code = node.attrs.tikzCode || '(figura TikZ vazia)'
        dom.innerHTML = `
          <div class="relative rounded-xl border border-white/[0.08] bg-black/10 p-4 hover:border-violet-500/30 transition-all">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-violet-400/40 mb-2">Figura TikZ</div>
            <pre class="text-[11px] text-violet-200/60 font-mono whitespace-pre-wrap overflow-hidden max-h-32">${escapeHtml(code)}</pre>
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-violet-400/50">
              Clique para editar
            </div>
          </div>
        `
      }

      render()

      dom.addEventListener('click', () => {
        const pos = typeof getPos === 'function' ? getPos() : null
        if (pos === null) return
        // Trigger the tikz editor via custom event
        const event = new CustomEvent('tikz-figure-click', {
          detail: { shapes: node.attrs.shapes, tikzCode: node.attrs.tikzCode, pos },
          bubbles: true,
        })
        dom.dispatchEvent(event)
      })

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'tikzFigure') return false
          node = updatedNode
          render()
          return true
        },
      }
    }
  },
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

**Step 2: Register the extension in useVioletaEditor**

Open `frontend/src/hooks/useVioletaEditor.ts` and:
1. Add import: `import { TikzFigureBlock } from '../extensions/TikzFigureBlock'`
2. Add `TikzFigureBlock` to the extensions array in the `useEditor()` call.

**Step 3: Commit**

```bash
git add frontend/src/extensions/TikzFigureBlock.ts frontend/src/hooks/useVioletaEditor.ts
git commit -m "feat(tikz): add TikzFigureBlock TipTap extension"
```

---

### Task 6: Integrate with Editor — App.tsx, SlashCommands, generateLatex, parseLatex

**Files:**
- Modify: `frontend/src/App.tsx` — add tikzEdit state, handlers, modal rendering
- Modify: `frontend/src/extensions/SlashCommands.tsx` — add `/tikz` command, extend callbacks
- Modify: `frontend/src/latex/generateLatex.ts:289` — add `tikzFigure` case
- Modify: `frontend/src/latex/parseLatex.ts:602-608` — add tikzpicture parsing

**Step 1: Add SlashCommands callback and `/tikz` entry**

In `frontend/src/extensions/SlashCommands.tsx`:

1. Add icon import — add `Shapes` to the lucide-react import (line 7-26):
   ```typescript
   Shapes,
   ```

2. Extend `SlashCommandCallbacks` (line 33-36) to add:
   ```typescript
   interface SlashCommandCallbacks {
     onOpenMathEditor?: (latex: string) => void
     onOpenImageModal?: () => void
     onOpenTikzEditor?: () => void
   }
   ```

3. Extend `SlashCommandsOptions` (line 479-482) to add:
   ```typescript
   interface SlashCommandsOptions {
     onOpenMathEditor?: (latex: string) => void
     onOpenImageModal?: () => void
     onOpenTikzEditor?: () => void
   }
   ```

4. Update `addOptions()` (line 487-491) to add `onOpenTikzEditor: undefined`.

5. Add a new command entry **before the rawLatex command** (before line 378):
   ```typescript
   {
     id: 'tikzFigure',
     label: 'Figura TikZ',
     category: 'Midia',
     icon: Shapes,
     aliases: ['tikz', 'figura', 'geometria', 'desenho', 'forma', 'tikzpicture'],
     action: (_editor, { onOpenTikzEditor }) => {
       onOpenTikzEditor?.()
     },
   },
   ```

6. In `executeCommand` (line 604), the callbacks already get spread — ensure `onOpenTikzEditor` is included in the `SlashCommandMenuProps` and passed through:
   - Add `onOpenTikzEditor` to `SlashCommandMenuProps` interface (line 536-540)
   - Pass it in the `executeCommand` call (line 604): `item.action(editor, { onOpenMathEditor, onOpenImageModal, onOpenTikzEditor })`

**Step 2: Add tikzFigure case in generateLatex.ts**

In `frontend/src/latex/generateLatex.ts`, add a case before the `default:` at line 290:

```typescript
    case 'tikzFigure': {
      const tikzCode = (node.attrs?.tikzCode ?? '') as string
      return tikzCode
    }
```

**Step 3: Add tikzpicture parsing in parseLatex.ts**

In `frontend/src/latex/parseLatex.ts`, add a check inside the environments section (after line 608, before line 610):

```typescript
    // TikZ figures → tikzFigure node (visual editor block)
    if (envName === 'tikzpicture') {
      const endTag = `\\end{tikzpicture}`
      const fullEnv = `\\begin{tikzpicture}\n${inner}\n${endTag}`
      return [{ type: 'tikzFigure', attrs: { tikzCode: fullEnv, shapes: [] } }]
    }
```

**Step 4: Wire up App.tsx**

In `frontend/src/App.tsx`:

1. Add imports (after line 23):
   ```typescript
   import { TikzShapeEditor } from './tikz/TikzShapeEditor'
   import type { TikzShape } from './tikz/types'
   ```

2. Add state (after line 85):
   ```typescript
   const [tikzEdit, setTikzEdit] = useState<{ shapes: TikzShape[]; pos: number; mode: 'insert' | 'edit' } | null>(null)
   ```

3. Add open callback (after `openMathEditor` at line 164):
   ```typescript
   const openTikzEditor = useCallback(() => {
     if (!editor) return
     setTikzEdit({
       shapes: [],
       pos: editor.state.selection.from,
       mode: 'insert',
     })
   }, [editor])
   ```

4. Add save/delete handlers (after `handleMathDelete` at line 254):
   ```typescript
   function handleTikzSave(tikzCode: string, shapes: TikzShape[]) {
     if (!tikzEdit || !editor) return
     if (tikzEdit.mode === 'insert') {
       editor.chain().focus().insertContent({
         type: 'tikzFigure',
         attrs: { tikzCode, shapes },
       }).run()
     } else {
       ;(editor.commands as any).updateTikzFigure({ tikzCode, shapes, pos: tikzEdit.pos })
     }
     setTikzEdit(null)
     editor.commands.focus()
   }

   function handleTikzDelete() {
     if (!tikzEdit || !editor) return
     if (tikzEdit.mode === 'edit') {
       ;(editor.commands as any).deleteTikzFigure({ pos: tikzEdit.pos })
     }
     setTikzEdit(null)
     editor.commands.focus()
   }
   ```

5. Add custom event listener for tikz-figure-click (inside the component, after the editor setup). Add a `useEffect` (after line 189):
   ```typescript
   useEffect(() => {
     function handleTikzClick(e: Event) {
       const detail = (e as CustomEvent).detail
       if (detail) {
         setTikzEdit({ shapes: detail.shapes || [], pos: detail.pos, mode: 'edit' })
       }
     }
     document.addEventListener('tikz-figure-click', handleTikzClick)
     return () => document.removeEventListener('tikz-figure-click', handleTikzClick)
   }, [])
   ```

6. Pass `onOpenTikzEditor={openTikzEditor}` to the components that need it:
   - In the `<Toolbar>` props (line 260-274), add `onOpenTikzEditor={openTikzEditor}` if Toolbar passes it to SlashCommands
   - In `<EditorArea>` (line 276), add `onOpenTikzEditor={openTikzEditor}`
   - Thread the callback through to `SlashCommandMenu` and `useVioletaEditor` as needed

7. Render the TikZ modal (after the mathEdit modal, after line 301):
   ```typescript
   {tikzEdit && (
     <TikzShapeEditor
       initialShapes={tikzEdit.shapes}
       onSave={handleTikzSave}
       onDelete={handleTikzDelete}
       onClose={() => setTikzEdit(null)}
       isInsert={tikzEdit.mode === 'insert'}
     />
   )}
   ```

**Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/extensions/SlashCommands.tsx frontend/src/latex/generateLatex.ts frontend/src/latex/parseLatex.ts
git commit -m "feat(tikz): integrate TikZ editor with editor, slash commands, and LaTeX round-trip"
```

---

### Task 7: Thread onOpenTikzEditor Through Components

**Files:**
- Modify: `frontend/src/hooks/useVioletaEditor.ts` — pass callback to SlashCommands extension options
- Modify: `frontend/src/components/editor/EditorArea.tsx` — accept and pass prop
- Modify: `frontend/src/components/toolbar/Toolbar.tsx` — accept and pass prop (if toolbar triggers it)
- Modify: `frontend/src/components/editor/BlockInsertMenu.tsx` — add TikZ figure option

**Step 1: Update useVioletaEditor**

The `SlashCommands` extension gets its callbacks via `options`. Add `onOpenTikzEditor` to the options passed when creating the extension:
```typescript
SlashCommands.configure({
  onOpenMathEditor: ...,
  onOpenImageModal: ...,
  onOpenTikzEditor: ...,
})
```

Check how `onOpenMathEditor` is currently wired and follow the same pattern.

**Step 2: Update EditorArea**

Add `onOpenTikzEditor` prop, pass it down to `SlashCommandMenu` and `BlockInsertMenu`.

**Step 3: Update BlockInsertMenu**

Add a "Figura TikZ" button in the media/figures section that calls `onOpenTikzEditor()`.

**Step 4: Commit**

```bash
git add frontend/src/hooks/useVioletaEditor.ts frontend/src/components/editor/EditorArea.tsx frontend/src/components/toolbar/Toolbar.tsx frontend/src/components/editor/BlockInsertMenu.tsx
git commit -m "feat(tikz): thread onOpenTikzEditor through all editor components"
```

---

### Task 8: Manual Testing & Polish

**Step 1: Run the dev server**

```bash
make frontend
```

**Step 2: Test the following scenarios**

1. Type `/tikz` in the editor → modal should open
2. Click "+ Forma" → add a circle → verify preview updates
3. Change fill color to `blue!30` → preview should show blue fill
4. Add a second shape (rectangle) → verify both appear in preview
5. Click "Inserir" → block should appear in editor
6. Click on the inserted block → modal should reopen in edit mode
7. Edit shapes and save → block should update
8. Check the RightPanel LaTeX output → should contain valid `\begin{tikzpicture}...\end{tikzpicture}`
9. Toggle manual LaTeX editing, then toggle back → tikzFigure blocks should survive round-trip

**Step 3: Fix any issues found during testing**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(tikz): polish and fix issues from manual testing"
```
