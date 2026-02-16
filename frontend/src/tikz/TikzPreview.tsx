import { useMemo } from 'react'
import type { TikzShape } from './types'
import { tikzColorToCSS } from './tikzColorToCSS'

const SCALE = 40 // 1 TikZ unit = 40px

function toSvgX(x: number): number {
  return x * SCALE
}

function toSvgY(y: number): number {
  return -y * SCALE // TikZ Y is up, SVG Y is down
}

interface SvgShapeAttrs {
  fill: string
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
}

function shapeToSvgAttrs(shape: TikzShape): SvgShapeAttrs {
  const fill = tikzColorToCSS(shape.fill ?? '')
  const stroke = tikzColorToCSS(shape.stroke ?? 'black')
  const strokeWidth = (shape.lineWidth ?? 0.4) * SCALE * 0.05

  let strokeDasharray: string | undefined
  if (shape.lineStyle === 'dashed') {
    strokeDasharray = `${strokeWidth * 4} ${strokeWidth * 3}`
  } else if (shape.lineStyle === 'dotted') {
    strokeDasharray = `${strokeWidth} ${strokeWidth * 2}`
  }

  return {
    fill,
    stroke,
    strokeWidth,
    strokeDasharray,
  }
}

function getShapeBounds(shape: TikzShape): { minX: number; minY: number; maxX: number; maxY: number } {
  const cx = shape.position.x
  const cy = shape.position.y

  switch (shape.type) {
    case 'circle': {
      const r = shape.radius
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r }
    }
    case 'rectangle': {
      const hw = shape.width / 2
      const hh = shape.height / 2
      return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh }
    }
    case 'square': {
      const hs = shape.side / 2
      return { minX: cx - hs, minY: cy - hs, maxX: cx + hs, maxY: cy + hs }
    }
    case 'triangle': {
      const hb = shape.base / 2
      const h = shape.height
      return { minX: cx - hb, minY: cy, maxX: cx + hb, maxY: cy + h }
    }
    case 'regular-polygon': {
      const r = shape.radius
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r }
    }
    case 'custom-polygon': {
      if (shape.vertices.length === 0) {
        return { minX: cx, minY: cy, maxX: cx, maxY: cy }
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const v of shape.vertices) {
        const vx = cx + v.x
        const vy = cy + v.y
        if (vx < minX) minX = vx
        if (vy < minY) minY = vy
        if (vx > maxX) maxX = vx
        if (vy > maxY) maxY = vy
      }
      return { minX, minY, maxX, maxY }
    }
  }
}

function regularPolygonPoints(cx: number, cy: number, sides: number, radius: number): string {
  const points: string[] = []
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2 // start from top
    const px = toSvgX(cx) + radius * SCALE * Math.cos(angle)
    const py = toSvgY(cy) + radius * SCALE * Math.sin(angle)
    points.push(`${px},${py}`)
  }
  return points.join(' ')
}

function renderShape(shape: TikzShape, _isSelected: boolean, dimmed: boolean = false): React.ReactNode {
  const attrs = dimmed
    ? { ...shapeToSvgAttrs(shape), fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.2, strokeDasharray: undefined }
    : shapeToSvgAttrs(shape)
  const cx = shape.position.x
  const cy = shape.position.y
  const transform = shape.rotation ? `rotate(${-shape.rotation} ${toSvgX(cx)} ${toSvgY(cy)})` : undefined
  const filter = dimmed ? undefined : (shape.shadow ? 'url(#shadow)' : undefined)

  let mainElement: React.ReactNode

  switch (shape.type) {
    case 'circle': {
      const svgCx = toSvgX(cx)
      const svgCy = toSvgY(cy)
      const r = shape.radius * SCALE
      mainElement = (
        <circle cx={svgCx} cy={svgCy} r={r} {...attrs} transform={transform} filter={filter} />
      )
      break
    }
    case 'rectangle': {
      const w = shape.width * SCALE
      const h = shape.height * SCALE
      const rx = toSvgX(cx) - w / 2
      const ry = toSvgY(cy) - h / 2
      mainElement = (
        <rect x={rx} y={ry} width={w} height={h} {...attrs} transform={transform} filter={filter} />
      )
      break
    }
    case 'square': {
      const s = shape.side * SCALE
      const rx = toSvgX(cx) - s / 2
      const ry = toSvgY(cy) - s / 2
      mainElement = (
        <rect x={rx} y={ry} width={s} height={s} {...attrs} transform={transform} filter={filter} />
      )
      break
    }
    case 'triangle': {
      const hb = shape.base / 2
      const h = shape.height
      const points = [
        `${toSvgX(cx)},${toSvgY(cy + h)}`,
        `${toSvgX(cx - hb)},${toSvgY(cy)}`,
        `${toSvgX(cx + hb)},${toSvgY(cy)}`,
      ].join(' ')
      mainElement = (
        <polygon points={points} {...attrs} transform={transform} filter={filter} />
      )
      break
    }
    case 'regular-polygon': {
      const points = regularPolygonPoints(cx, cy, shape.sides, shape.radius)
      mainElement = (
        <polygon points={points} {...attrs} transform={transform} filter={filter} />
      )
      break
    }
    case 'custom-polygon': {
      const points = shape.vertices
        .map((v) => `${toSvgX(cx + v.x)},${toSvgY(cy + v.y)}`)
        .join(' ')
      mainElement = (
        <polygon points={points} {...attrs} transform={transform} filter={filter} />
      )
      break
    }
  }

  const labelElement = shape.label ? (
    <text
      x={toSvgX(cx)}
      y={toSvgY(cy)}
      textAnchor="middle"
      dominantBaseline="central"
      fill="currentColor"
      fontSize={12}
      transform={transform}
    >
      {shape.label}
    </text>
  ) : null

  const groupOpacity = dimmed ? 0.6 : (shape.opacity ?? 1)

  return (
    <g key={shape.id} style={{ opacity: groupOpacity }}>
      {mainElement}
      {dimmed ? null : labelElement}
    </g>
  )
}

interface TikzPreviewProps {
  shapes: TikzShape[]
  selectedId?: string
  showGrid?: boolean
  hideOthers?: boolean
  zoom?: number
  width?: number
  height?: number
}

export function TikzPreview({
  shapes,
  selectedId,
  showGrid = true,
  hideOthers = false,
  zoom = 1,
  width = 600,
  height = 400,
}: TikzPreviewProps) {
  const viewBox = useMemo(() => {
    const padding = 3

    if (shapes.length === 0) {
      return {
        minX: -padding,
        minY: -padding,
        width: padding * 2,
        height: padding * 2,
      }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const shape of shapes) {
      const bounds = getShapeBounds(shape)
      if (bounds.minX < minX) minX = bounds.minX
      if (bounds.minY < minY) minY = bounds.minY
      if (bounds.maxX > maxX) maxX = bounds.maxX
      if (bounds.maxY > maxY) maxY = bounds.maxY
    }

    // Convert to SVG coordinates
    const svgMinX = toSvgX(minX - padding)
    const svgMinY = toSvgY(maxY + padding) // maxY becomes minY in SVG coords
    const svgWidth = (maxX - minX + padding * 2) * SCALE
    const svgHeight = (maxY - minY + padding * 2) * SCALE

    return {
      minX: svgMinX / zoom,
      minY: svgMinY / zoom,
      width: svgWidth / zoom,
      height: svgHeight / zoom,
    }
  }, [shapes, zoom])

  const gridLines = useMemo(() => {
    if (!showGrid) return null

    const vb = viewBox
    const startX = Math.floor(vb.minX / SCALE) * SCALE
    const endX = Math.ceil((vb.minX + vb.width) / SCALE) * SCALE
    const startY = Math.floor(vb.minY / SCALE) * SCALE
    const endY = Math.ceil((vb.minY + vb.height) / SCALE) * SCALE

    const lines: React.ReactNode[] = []

    // Vertical grid lines
    for (let x = startX; x <= endX; x += SCALE) {
      const isAxis = x === 0
      lines.push(
        <line
          key={`v${x}`}
          x1={x}
          y1={startY}
          x2={x}
          y2={endY}
          stroke="#8000ff"
          strokeWidth={isAxis ? 1.2 : 0.5}
          opacity={isAxis ? 0.4 : 0.15}
        />
      )
    }

    // Horizontal grid lines
    for (let y = startY; y <= endY; y += SCALE) {
      const isAxis = y === 0
      lines.push(
        <line
          key={`h${y}`}
          x1={startX}
          y1={y}
          x2={endX}
          y2={y}
          stroke="#8000ff"
          strokeWidth={isAxis ? 1.2 : 0.5}
          opacity={isAxis ? 0.4 : 0.15}
        />
      )
    }

    return lines
  }, [showGrid, viewBox])

  return (
    <div className="bg-black/20 rounded-xl border border-white/[0.06]">
      <svg
        width={width}
        height={height}
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.4" />
          </filter>
        </defs>

        {gridLines}

        {/* When no shape is selected, render all shapes normally */}
        {selectedId == null && shapes.map((shape) => renderShape(shape, false, false))}

        {/* Background shapes (non-selected, rendered first = behind) */}
        {selectedId != null && !hideOthers && shapes
          .filter((s) => s.id !== selectedId)
          .map((shape) => renderShape(shape, false, true))}

        {/* Selected shape on top */}
        {selectedId != null && shapes
          .filter((s) => s.id === selectedId)
          .map((shape) => renderShape(shape, true, false))}
      </svg>
    </div>
  )
}
