import { useMemo } from 'react'
import { compile } from 'mathjs'
import type { PgfplotConfig, PlotSeries, FunctionPlot2D, FunctionPlot3D, DataPlot, AxisConfig } from './types'

const COLORS = {
  grid: '#8000ff',
  axis: '#8000ff',
  text: '#c4b5fd',
}

interface PlotPreviewProps {
  config: PgfplotConfig
  selectedId?: string
  showGrid?: boolean
  zoom?: number
  width?: number
  height?: number
}

interface Bounds {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

function parseBounds(axis: AxisConfig, plots: PlotSeries[]): Bounds {
  let xmin = axis.xmin ? parseFloat(axis.xmin) : NaN
  let xmax = axis.xmax ? parseFloat(axis.xmax) : NaN
  let ymin = axis.ymin ? parseFloat(axis.ymin) : NaN
  let ymax = axis.ymax ? parseFloat(axis.ymax) : NaN

  // Infer from plots if bounds not set
  if (isNaN(xmin) || isNaN(xmax)) {
    for (const p of plots) {
      if (p.type === 'function2d') {
        if (isNaN(xmin) || p.domain[0] < xmin) xmin = p.domain[0]
        if (isNaN(xmax) || p.domain[1] > xmax) xmax = p.domain[1]
      } else if (p.type === 'function3d') {
        if (isNaN(xmin) || p.domainX[0] < xmin) xmin = p.domainX[0]
        if (isNaN(xmax) || p.domainX[1] > xmax) xmax = p.domainX[1]
      }
    }
  }
  if (isNaN(xmin)) xmin = -5
  if (isNaN(xmax)) xmax = 5
  if (isNaN(ymin)) ymin = -5
  if (isNaN(ymax)) ymax = 5

  return { xmin, xmax, ymin, ymax }
}

/** Convert pgfplots expression syntax to mathjs-compatible syntax */
function normalizePgfExpr(expr: string): string {
  // pgfplots trig functions expect degrees; deg(x) converts rad→deg.
  // mathjs trig functions expect radians, so sin(deg(x)) in pgfplots = sin(x) in mathjs.
  // Remove deg(...) wrapper — keeps the inner expression.
  let e = expr.replace(/\bdeg\(([^)]+)\)/g, '($1)')
  // pgfplots uses ^ for power, mathjs supports it too — no change needed
  // pgfplots uses e.g. \pi — strip backslash
  e = e.replace(/\\pi\b/g, 'pi')
  e = e.replace(/\\e\b/g, 'e')
  // pgfplots ln → mathjs log (natural log)
  e = e.replace(/\bln\(/g, 'log(')
  return e
}

function evaluateFunction2D(expr: string, xmin: number, xmax: number, samples: number): { x: number; y: number }[] {
  try {
    const compiled = compile(normalizePgfExpr(expr))
    const points: { x: number; y: number }[] = []
    const step = (xmax - xmin) / (samples - 1)
    for (let i = 0; i < samples; i++) {
      const x = xmin + i * step
      try {
        const y = compiled.evaluate({ x })
        if (typeof y === 'number' && isFinite(y)) {
          points.push({ x, y })
        }
      } catch {
        // Skip undefined points
      }
    }
    return points
  } catch {
    return []
  }
}

function evaluateFunction3D(expr: string, plot: FunctionPlot3D): { x: number; y: number; z: number }[] {
  try {
    const compiled = compile(normalizePgfExpr(expr))
    const points: { x: number; y: number; z: number }[] = []
    const samplesX = Math.min(plot.samples, 30)
    const samplesY = Math.min(plot.samples, 30)
    const stepX = (plot.domainX[1] - plot.domainX[0]) / (samplesX - 1)
    const stepY = (plot.domainY[1] - plot.domainY[0]) / (samplesY - 1)
    for (let i = 0; i < samplesX; i++) {
      for (let j = 0; j < samplesY; j++) {
        const x = plot.domainX[0] + i * stepX
        const y = plot.domainY[0] + j * stepY
        try {
          const z = compiled.evaluate({ x, y })
          if (typeof z === 'number' && isFinite(z)) {
            points.push({ x, y, z })
          }
        } catch {
          // Skip
        }
      }
    }
    return points
  } catch {
    return []
  }
}

function parseCSVData(plot: DataPlot): { x: number; y: number }[] {
  const lines = plot.data.trim().split('\n')
  if (lines.length === 0) return []

  let startIdx = 0
  let xIdx = 0
  let yIdx = 1

  if (plot.hasHeader && lines.length > 1) {
    const headers = lines[0].split(',').map(h => h.trim())
    xIdx = headers.indexOf(plot.xColumn)
    yIdx = headers.indexOf(plot.yColumn)
    if (xIdx < 0) xIdx = 0
    if (yIdx < 0) yIdx = 1
    startIdx = 1
  }

  const points: { x: number; y: number }[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    const x = parseFloat(cols[xIdx])
    const y = parseFloat(cols[yIdx])
    if (isFinite(x) && isFinite(y)) {
      points.push({ x, y })
    }
  }
  return points
}

function getLineStyle(style: string): string | undefined {
  if (style === 'dashed') return '8 4'
  if (style === 'dotted') return '3 3'
  return undefined
}

function renderGrid(
  bounds: Bounds,
  toX: (x: number) => number,
  toY: (y: number) => number,
  svgW: number,
  svgH: number,
  padding: number,
  showAxis: boolean = true,
  showGrid: boolean = true,
): React.ReactNode[] {
  const elements: React.ReactNode[] = []

  // Calculate nice grid intervals
  const xRange = bounds.xmax - bounds.xmin
  const yRange = bounds.ymax - bounds.ymin
  const xStep = niceStep(xRange)
  const yStep = niceStep(yRange)

  // Vertical grid lines
  const xStart = Math.ceil(bounds.xmin / xStep) * xStep
  for (let x = xStart; x <= bounds.xmax; x += xStep) {
    const sx = toX(x)
    const isAxis = Math.abs(x) < xStep * 0.01

    // Axis line (x=0): thin, light — controlled by showAxis
    // Grid lines: controlled by showGrid
    if (isAxis && showAxis) {
      elements.push(
        <line
          key={`gv${x}`}
          x1={sx} y1={padding} x2={sx} y2={svgH - padding}
          stroke={COLORS.grid}
          strokeWidth={0.8}
          opacity={0.3}
        />
      )
    } else if (!isAxis && showGrid) {
      elements.push(
        <line
          key={`gv${x}`}
          x1={sx} y1={padding} x2={sx} y2={svgH - padding}
          stroke={COLORS.grid}
          strokeWidth={0.5}
          opacity={0.15}
        />
      )
    }

    // Labels when showAxis is true
    {showAxis && elements.push(
      <text
        key={`lv${x}`}
        x={sx} y={svgH - padding + 14}
        textAnchor="middle"
        fill={COLORS.text}
        fontSize={10}
        opacity={0.7}
      >
        {Number(x.toFixed(6))}
      </text>
    )}
  }

  // Horizontal grid lines
  const yStart = Math.ceil(bounds.ymin / yStep) * yStep
  for (let y = yStart; y <= bounds.ymax; y += yStep) {
    const sy = toY(y)
    const isAxis = Math.abs(y) < yStep * 0.01

    if (isAxis && showAxis) {
      elements.push(
        <line
          key={`gh${y}`}
          x1={padding} y1={sy} x2={svgW - padding} y2={sy}
          stroke={COLORS.grid}
          strokeWidth={0.8}
          opacity={0.3}
        />
      )
    } else if (!isAxis && showGrid) {
      elements.push(
        <line
          key={`gh${y}`}
          x1={padding} y1={sy} x2={svgW - padding} y2={sy}
          stroke={COLORS.grid}
          strokeWidth={0.5}
          opacity={0.15}
        />
      )
    }

    // Labels when showAxis is true
    {showAxis && elements.push(
      <text
        key={`lh${y}`}
        x={padding - 6} y={sy + 3}
        textAnchor="end"
        fill={COLORS.text}
        fontSize={10}
        opacity={0.7}
      >
        {Number(y.toFixed(6))}
      </text>
    )}
  }

  return elements
}

function niceStep(range: number): number {
  const rough = range / 6
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / pow
  if (norm < 1.5) return pow
  if (norm < 3.5) return 2 * pow
  if (norm < 7.5) return 5 * pow
  return 10 * pow
}

function render2DPlot(
  plot: FunctionPlot2D,
  bounds: Bounds,
  toX: (x: number) => number,
  toY: (y: number) => number,
  dimmed: boolean,
): React.ReactNode {
  const points = evaluateFunction2D(plot.expression, plot.domain[0], plot.domain[1], plot.samples)
  if (points.length === 0) return null

  // Auto-adjust Y bounds
  const pointsStr = points
    .filter(p => p.y >= bounds.ymin && p.y <= bounds.ymax)
    .map(p => `${toX(p.x)},${toY(p.y)}`)
    .join(' ')

  return (
    <g key={plot.id} opacity={dimmed ? 0.3 : 1}>
      <polyline
        points={pointsStr}
        fill="none"
        stroke={plot.color}
        strokeWidth={plot.lineWidth * (dimmed ? 0.7 : 1)}
        strokeDasharray={getLineStyle(plot.lineStyle)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

function render3DHeatmap(
  plot: FunctionPlot3D,
  toX: (x: number) => number,
  toY: (y: number) => number,
  bounds: Bounds,
  dimmed: boolean,
): React.ReactNode {
  const points = evaluateFunction3D(plot.expression, plot)
  if (points.length === 0) return null

  // Find z range
  let zMin = Infinity, zMax = -Infinity
  for (const p of points) {
    if (p.z < zMin) zMin = p.z
    if (p.z > zMax) zMax = p.z
  }
  if (zMin === zMax) zMax = zMin + 1

  const samplesX = Math.min(plot.samples, 30)
  const samplesY = Math.min(plot.samples, 30)
  const cellW = (bounds.xmax - bounds.xmin) / (samplesX - 1)
  const cellH = (bounds.ymax - bounds.ymin) / (samplesY - 1)

  return (
    <g key={plot.id} opacity={dimmed ? 0.3 : 1}>
      {points.map((p, i) => {
        const t = (p.z - zMin) / (zMax - zMin)
        const r = Math.round(255 * t)
        const b = Math.round(255 * (1 - t))
        const g = Math.round(100 * (1 - Math.abs(2 * t - 1)))
        return (
          <rect
            key={i}
            x={toX(p.x) - Math.abs(toX(cellW) - toX(0)) / 2}
            y={toY(p.y) - Math.abs(toY(cellH) - toY(0)) / 2}
            width={Math.abs(toX(cellW) - toX(0))}
            height={Math.abs(toY(cellH) - toY(0))}
            fill={`rgb(${r},${g},${b})`}
          />
        )
      })}
    </g>
  )
}

function renderDataPlot(
  plot: DataPlot,
  toX: (x: number) => number,
  toY: (y: number) => number,
  bounds: Bounds,
  dimmed: boolean,
): React.ReactNode {
  const points = parseCSVData(plot)
  if (points.length === 0) return null

  if (plot.chartType === 'bar') {
    const barWidth = points.length > 1
      ? Math.abs(toX(points[1].x) - toX(points[0].x)) * 0.6
      : 20
    return (
      <g key={plot.id} opacity={dimmed ? 0.3 : 1}>
        {points.map((p, i) => {
          const sx = toX(p.x)
          const sy = toY(p.y)
          const baseY = toY(0)
          return (
            <rect
              key={i}
              x={sx - barWidth / 2}
              y={Math.min(sy, baseY)}
              width={barWidth}
              height={Math.abs(baseY - sy)}
              fill={plot.color}
              opacity={0.7}
              stroke={plot.color}
              strokeWidth={1}
            />
          )
        })}
      </g>
    )
  }

  if (plot.chartType === 'scatter') {
    return (
      <g key={plot.id} opacity={dimmed ? 0.3 : 1}>
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={3}
            fill={plot.color}
          />
        ))}
      </g>
    )
  }

  // Line
  const pointsStr = points
    .filter(p => p.x >= bounds.xmin && p.x <= bounds.xmax)
    .map(p => `${toX(p.x)},${toY(p.y)}`)
    .join(' ')

  return (
    <g key={plot.id} opacity={dimmed ? 0.3 : 1}>
      <polyline
        points={pointsStr}
        fill="none"
        stroke={plot.color}
        strokeWidth={plot.lineWidth}
        strokeDasharray={getLineStyle(plot.lineStyle)}
      />
      {points.map((p, i) => (
        <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r={2.5} fill={plot.color} />
      ))}
    </g>
  )
}

export function PlotPreview({
  config,
  selectedId,
  showGrid = true,
  zoom = 1,
  width = 300,
  height = 280,
}: PlotPreviewProps) {
  const svgContent = useMemo(() => {
    const padding = 40
    const plotW = width - padding * 2
    const plotH = height - padding * 2

    // Compute bounds from axis config and plots
    let bounds = parseBounds(config.axis, config.plots)

    // Auto-adjust Y from function evaluations
    if (!config.axis.ymin && !config.axis.ymax && config.plots.length > 0) {
      let autoYmin = Infinity
      let autoYmax = -Infinity
      for (const p of config.plots) {
        if (p.type === 'function2d') {
          const pts = evaluateFunction2D(p.expression, p.domain[0], p.domain[1], p.samples)
          for (const pt of pts) {
            if (pt.y < autoYmin) autoYmin = pt.y
            if (pt.y > autoYmax) autoYmax = pt.y
          }
        } else if (p.type === 'data') {
          const pts = parseCSVData(p)
          for (const pt of pts) {
            if (pt.y < autoYmin) autoYmin = pt.y
            if (pt.y > autoYmax) autoYmax = pt.y
          }
        }
      }
      if (isFinite(autoYmin) && isFinite(autoYmax)) {
        const yPad = (autoYmax - autoYmin) * 0.15 || 1
        bounds = { ...bounds, ymin: autoYmin - yPad, ymax: autoYmax + yPad }
      }
    }

    const toX = (x: number) => padding + ((x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * plotW
    const toY = (y: number) => padding + ((bounds.ymax - y) / (bounds.ymax - bounds.ymin)) * plotH

    const showAxisLines = config.axis.showAxis !== false
    const showGridLines = config.axis.showGrid !== false
    const gridElements = (showGrid && (showAxisLines || showGridLines))
      ? renderGrid(bounds, toX, toY, width, height, padding, showAxisLines, showGridLines)
      : []

    const plotElements = config.plots.map(plot => {
      const dimmed = selectedId != null && plot.id !== selectedId

      switch (plot.type) {
        case 'function2d':
          return render2DPlot(plot, bounds, toX, toY, dimmed)
        case 'function3d':
          return render3DHeatmap(plot, toX, toY, bounds, dimmed)
        case 'data':
          return renderDataPlot(plot, toX, toY, bounds, dimmed)
      }
    })

    // Axis labels
    const labels: React.ReactNode[] = []
    if (config.axis.xlabel) {
      labels.push(
        <text key="xlabel" x={width / 2} y={height - 4} textAnchor="middle" fill={COLORS.text} fontSize={11}>
          {config.axis.xlabel}
        </text>
      )
    }
    if (config.axis.ylabel) {
      labels.push(
        <text key="ylabel" x={10} y={height / 2} textAnchor="middle" fill={COLORS.text} fontSize={11} transform={`rotate(-90, 10, ${height / 2})`}>
          {config.axis.ylabel}
        </text>
      )
    }
    if (config.axis.title) {
      labels.push(
        <text key="title" x={width / 2} y={16} textAnchor="middle" fill={COLORS.text} fontSize={12} fontWeight="bold">
          {config.axis.title}
        </text>
      )
    }

    return { gridElements, plotElements, labels, backgroundColor: config.axis.backgroundColor, padding }
  }, [config, selectedId, showGrid, width, height, zoom])

  return (
    <div className="v-modal-preview-box rounded-xl">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        {svgContent.backgroundColor && (
          <rect
            x={svgContent.padding}
            y={svgContent.padding}
            width={width - svgContent.padding * 2}
            height={height - svgContent.padding * 2}
            fill={svgContent.backgroundColor}
          />
        )}
        {svgContent.gridElements}
        {svgContent.plotElements}
        {svgContent.labels}
      </svg>
    </div>
  )
}
