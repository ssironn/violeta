import { compile } from 'mathjs'
import type { PgfplotConfig, PlotSeries, FunctionPlot2D, FunctionPlot3D, DataPlot, AxisConfig } from './types'

const SVG_NS = 'http://www.w3.org/2000/svg'

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

function niceStep(range: number): number {
  const rough = range / 6
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / pow
  if (norm < 1.5) return pow
  if (norm < 3.5) return 2 * pow
  if (norm < 7.5) return 5 * pow
  return 10 * pow
}

/** Convert pgfplots expression syntax to mathjs-compatible syntax */
function normalizePgfExpr(expr: string): string {
  let e = expr.replace(/\bdeg\(([^)]+)\)/g, '($1)')
  e = e.replace(/\\pi\b/g, 'pi')
  e = e.replace(/\\e\b/g, 'e')
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

const COLORS = {
  grid: '#8000ff',
  axis: '#8000ff',
  text: '#94a3b8',
}

/**
 * Renders a PgfplotConfig into a container element as an inline SVG.
 * Pure DOM — no React dependency.
 */
export function renderPlotSvg(container: HTMLElement, config: PgfplotConfig, width = 400, height = 280): void {
  container.innerHTML = ''

  if (!config.plots || config.plots.length === 0) return

  const padding = 40
  const plotW = width - padding * 2
  const plotH = height - padding * 2

  let bounds = parseBounds(config.axis, config.plots)

  // Auto-adjust Y bounds to fit all evaluated points within the visible X range
  {
    const hasExplicitYmin = !!config.axis.ymin
    const hasExplicitYmax = !!config.axis.ymax
    let autoYmin = hasExplicitYmin ? bounds.ymin : Infinity
    let autoYmax = hasExplicitYmax ? bounds.ymax : -Infinity
    for (const p of config.plots) {
      if (p.type === 'function2d') {
        const evalXmin = Math.max(p.domain[0], bounds.xmin)
        const evalXmax = Math.min(p.domain[1], bounds.xmax)
        if (evalXmin >= evalXmax) continue
        const pts = evaluateFunction2D(p.expression, evalXmin, evalXmax, p.samples)
        for (const pt of pts) {
          if (!hasExplicitYmin && pt.y < autoYmin) autoYmin = pt.y
          if (!hasExplicitYmax && pt.y > autoYmax) autoYmax = pt.y
        }
      } else if (p.type === 'data') {
        const pts = parseCSVData(p)
        for (const pt of pts) {
          if (pt.x < bounds.xmin || pt.x > bounds.xmax) continue
          if (!hasExplicitYmin && pt.y < autoYmin) autoYmin = pt.y
          if (!hasExplicitYmax && pt.y > autoYmax) autoYmax = pt.y
        }
      }
    }
    if (isFinite(autoYmin) && isFinite(autoYmax)) {
      const yPad = (autoYmax - autoYmin) * 0.15 || 1
      bounds = {
        ...bounds,
        ymin: hasExplicitYmin ? bounds.ymin : autoYmin - yPad,
        ymax: hasExplicitYmax ? bounds.ymax : autoYmax + yPad,
      }
    }
  }

  const toX = (x: number) => padding + ((x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * plotW
  const toY = (y: number) => padding + ((bounds.ymax - y) / (bounds.ymax - bounds.ymin)) * plotH

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.style.display = 'block'
  svg.style.width = '100%'
  svg.style.height = 'auto'

  const showAxis = config.axis.showAxis !== false

  // Background
  if (config.axis.backgroundColor) {
    const bg = document.createElementNS(SVG_NS, 'rect')
    bg.setAttribute('x', String(padding))
    bg.setAttribute('y', String(padding))
    bg.setAttribute('width', String(plotW))
    bg.setAttribute('height', String(plotH))
    bg.setAttribute('fill', config.axis.backgroundColor)
    svg.appendChild(bg)
  }

  // Grid
  const xRange = bounds.xmax - bounds.xmin
  const yRange = bounds.ymax - bounds.ymin
  const xStep = niceStep(xRange)
  const yStep = niceStep(yRange)

  const xStart = Math.ceil(bounds.xmin / xStep) * xStep
  for (let x = xStart; x <= bounds.xmax; x += xStep) {
    const sx = toX(x)
    const isAxis = Math.abs(x) < xStep * 0.01
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('x1', String(sx))
    line.setAttribute('y1', String(padding))
    line.setAttribute('x2', String(sx))
    line.setAttribute('y2', String(height - padding))
    line.setAttribute('stroke', COLORS.grid)
    line.setAttribute('stroke-width', isAxis && showAxis ? '1.5' : '0.5')
    line.setAttribute('opacity', isAxis && showAxis ? '0.5' : '0.15')
    svg.appendChild(line)

    if (showAxis) {
      const label = document.createElementNS(SVG_NS, 'text')
      label.setAttribute('x', String(sx))
      label.setAttribute('y', String(height - padding + 14))
      label.setAttribute('text-anchor', 'middle')
      label.setAttribute('fill', COLORS.text)
      label.setAttribute('font-size', '10')
      label.setAttribute('opacity', '0.7')
      label.textContent = String(Number(x.toFixed(6)))
      svg.appendChild(label)
    }
  }

  const yStart = Math.ceil(bounds.ymin / yStep) * yStep
  for (let y = yStart; y <= bounds.ymax; y += yStep) {
    const sy = toY(y)
    const isAxis = Math.abs(y) < yStep * 0.01
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('x1', String(padding))
    line.setAttribute('y1', String(sy))
    line.setAttribute('x2', String(width - padding))
    line.setAttribute('y2', String(sy))
    line.setAttribute('stroke', COLORS.grid)
    line.setAttribute('stroke-width', isAxis && showAxis ? '1.5' : '0.5')
    line.setAttribute('opacity', isAxis && showAxis ? '0.5' : '0.15')
    svg.appendChild(line)

    if (showAxis) {
      const label = document.createElementNS(SVG_NS, 'text')
      label.setAttribute('x', String(padding - 6))
      label.setAttribute('y', String(sy + 3))
      label.setAttribute('text-anchor', 'end')
      label.setAttribute('fill', COLORS.text)
      label.setAttribute('font-size', '10')
      label.setAttribute('opacity', '0.7')
      label.textContent = String(Number(y.toFixed(6)))
      svg.appendChild(label)
    }
  }

  // Render plots
  for (const plot of config.plots) {
    switch (plot.type) {
      case 'function2d':
        render2D(svg, plot, bounds, toX, toY)
        break
      case 'function3d':
        render3D(svg, plot, toX, toY, bounds)
        break
      case 'data':
        renderData(svg, plot, toX, toY, bounds)
        break
    }
  }

  // Axis labels
  if (config.axis.xlabel) {
    const t = document.createElementNS(SVG_NS, 'text')
    t.setAttribute('x', String(width / 2))
    t.setAttribute('y', String(height - 4))
    t.setAttribute('text-anchor', 'middle')
    t.setAttribute('fill', COLORS.text)
    t.setAttribute('font-size', '11')
    t.textContent = config.axis.xlabel
    svg.appendChild(t)
  }
  if (config.axis.ylabel) {
    const t = document.createElementNS(SVG_NS, 'text')
    t.setAttribute('x', '10')
    t.setAttribute('y', String(height / 2))
    t.setAttribute('text-anchor', 'middle')
    t.setAttribute('fill', COLORS.text)
    t.setAttribute('font-size', '11')
    t.setAttribute('transform', `rotate(-90, 10, ${height / 2})`)
    t.textContent = config.axis.ylabel
    svg.appendChild(t)
  }
  if (config.axis.title) {
    const t = document.createElementNS(SVG_NS, 'text')
    t.setAttribute('x', String(width / 2))
    t.setAttribute('y', '16')
    t.setAttribute('text-anchor', 'middle')
    t.setAttribute('fill', COLORS.text)
    t.setAttribute('font-size', '12')
    t.setAttribute('font-weight', 'bold')
    t.textContent = config.axis.title
    svg.appendChild(t)
  }

  const wrapper = document.createElement('div')
  wrapper.style.background = 'rgba(0,0,0,0.08)'
  wrapper.style.borderRadius = '0.75rem'
  wrapper.style.border = '1px solid rgba(0,0,0,0.04)'
  wrapper.style.overflow = 'hidden'
  wrapper.appendChild(svg)
  container.appendChild(wrapper)
}

function render2D(
  svg: SVGSVGElement,
  plot: FunctionPlot2D,
  bounds: Bounds,
  toX: (x: number) => number,
  toY: (y: number) => number,
): void {
  const points = evaluateFunction2D(plot.expression, plot.domain[0], plot.domain[1], plot.samples)
  if (points.length === 0) return

  const pointsStr = points
    .map(p => `${toX(p.x)},${toY(p.y)}`)
    .join(' ')

  const polyline = document.createElementNS(SVG_NS, 'polyline')
  polyline.setAttribute('points', pointsStr)
  polyline.setAttribute('fill', 'none')
  polyline.setAttribute('stroke', plot.color)
  polyline.setAttribute('stroke-width', String(plot.lineWidth))
  polyline.setAttribute('stroke-linecap', 'round')
  polyline.setAttribute('stroke-linejoin', 'round')
  const dash = getLineStyle(plot.lineStyle)
  if (dash) polyline.setAttribute('stroke-dasharray', dash)
  svg.appendChild(polyline)
}

function render3D(
  svg: SVGSVGElement,
  plot: FunctionPlot3D,
  toX: (x: number) => number,
  toY: (y: number) => number,
  bounds: Bounds,
): void {
  const points = evaluateFunction3D(plot.expression, plot)
  if (points.length === 0) return

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

  for (const p of points) {
    const t = (p.z - zMin) / (zMax - zMin)
    const r = Math.round(255 * t)
    const b = Math.round(255 * (1 - t))
    const g = Math.round(100 * (1 - Math.abs(2 * t - 1)))

    const rect = document.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('x', String(toX(p.x) - Math.abs(toX(cellW) - toX(0)) / 2))
    rect.setAttribute('y', String(toY(p.y) - Math.abs(toY(cellH) - toY(0)) / 2))
    rect.setAttribute('width', String(Math.abs(toX(cellW) - toX(0))))
    rect.setAttribute('height', String(Math.abs(toY(cellH) - toY(0))))
    rect.setAttribute('fill', `rgb(${r},${g},${b})`)
    svg.appendChild(rect)
  }
}

function renderData(
  svg: SVGSVGElement,
  plot: DataPlot,
  toX: (x: number) => number,
  toY: (y: number) => number,
  bounds: Bounds,
): void {
  const points = parseCSVData(plot)
  if (points.length === 0) return

  if (plot.chartType === 'bar') {
    const barWidth = points.length > 1
      ? Math.abs(toX(points[1].x) - toX(points[0].x)) * 0.6
      : 20
    for (const p of points) {
      const sx = toX(p.x)
      const sy = toY(p.y)
      const baseY = toY(0)
      const rect = document.createElementNS(SVG_NS, 'rect')
      rect.setAttribute('x', String(sx - barWidth / 2))
      rect.setAttribute('y', String(Math.min(sy, baseY)))
      rect.setAttribute('width', String(barWidth))
      rect.setAttribute('height', String(Math.abs(baseY - sy)))
      rect.setAttribute('fill', plot.color)
      rect.setAttribute('opacity', '0.7')
      rect.setAttribute('stroke', plot.color)
      rect.setAttribute('stroke-width', '1')
      svg.appendChild(rect)
    }
    return
  }

  if (plot.chartType === 'scatter') {
    for (const p of points) {
      const circle = document.createElementNS(SVG_NS, 'circle')
      circle.setAttribute('cx', String(toX(p.x)))
      circle.setAttribute('cy', String(toY(p.y)))
      circle.setAttribute('r', '3')
      circle.setAttribute('fill', plot.color)
      svg.appendChild(circle)
    }
    return
  }

  // Line chart
  const pointsStr = points
    .filter(p => p.x >= bounds.xmin && p.x <= bounds.xmax)
    .map(p => `${toX(p.x)},${toY(p.y)}`)
    .join(' ')

  const polyline = document.createElementNS(SVG_NS, 'polyline')
  polyline.setAttribute('points', pointsStr)
  polyline.setAttribute('fill', 'none')
  polyline.setAttribute('stroke', plot.color)
  polyline.setAttribute('stroke-width', String(plot.lineWidth))
  const dash = getLineStyle(plot.lineStyle)
  if (dash) polyline.setAttribute('stroke-dasharray', dash)
  svg.appendChild(polyline)

  for (const p of points) {
    const circle = document.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('cx', String(toX(p.x)))
    circle.setAttribute('cy', String(toY(p.y)))
    circle.setAttribute('r', '2.5')
    circle.setAttribute('fill', plot.color)
    svg.appendChild(circle)
  }
}
