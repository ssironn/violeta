import type { PgfplotConfig, AxisConfig, PlotSeries, FunctionPlot2D, FunctionPlot3D, DataPlot } from './types'
import { createDefaultAxisConfig } from './types'

/**
 * Parse a pgfplots LaTeX string (tikzpicture containing an axis environment)
 * into a PgfplotConfig suitable for the visual editor.
 * Returns null if parsing fails or the code is not recognizable.
 */
export function parsePgfplotsCode(latex: string): PgfplotConfig | null {
  try {
    // Extract axis environment content
    const axisMatch = latex.match(/\\begin\{axis\}\s*(\[[\s\S]*?\])?([\s\S]*?)\\end\{axis\}/)
    if (!axisMatch) return null

    const axisOptsRaw = axisMatch[1] || ''
    const axisBody = axisMatch[2]

    const axis = parseAxisOptions(axisOptsRaw)
    const plots = parsePlots(axisBody)

    if (plots.length === 0) return null

    return { axis, plots }
  } catch {
    return null
  }
}

/** Parse the [key=value, ...] options block of an axis environment */
function parseAxisOptions(raw: string): AxisConfig {
  const axis = createDefaultAxisConfig()
  if (!raw) return axis

  // Strip outer brackets
  const inner = raw.replace(/^\[/, '').replace(/\]$/, '').trim()
  const opts = splitOptions(inner)

  for (const opt of opts) {
    const [key, val] = splitKeyVal(opt)

    switch (key) {
      case 'title': axis.title = stripBraces(val); break
      case 'xlabel': axis.xlabel = stripBraces(val); break
      case 'ylabel': axis.ylabel = stripBraces(val); break
      case 'xmin': axis.xmin = val; break
      case 'xmax': axis.xmax = val; break
      case 'ymin': axis.ymin = val; break
      case 'ymax': axis.ymax = val; break
      case 'width': axis.width = val; break
      case 'height': axis.height = val; break
      case 'grid': {
        const g = val as AxisConfig['grid']
        if (['none', 'major', 'minor', 'both'].includes(g)) axis.grid = g
        break
      }
      case 'legend pos': {
        const lp = val as AxisConfig['legendPos']
        if (['north east', 'north west', 'south east', 'south west', 'outer north east'].includes(lp)) {
          axis.legendPos = lp
        }
        break
      }
      case 'hide axis': axis.showAxis = false; break
      case 'axis lines':
        if (val === 'none') axis.showAxis = false
        break
      case 'axis background/.style': {
        const fillMatch = val.match(/fill\s*=\s*(.+)/)
        if (fillMatch) axis.backgroundColor = tikzColorToHex(fillMatch[1].trim())
        break
      }
    }
  }

  return axis
}

/** Parse all \addplot commands from the axis body */
function parsePlots(body: string): PlotSeries[] {
  const plots: PlotSeries[] = []

  // Match \addplot or \addplot3 commands — they end with ;
  // Also capture the following \addlegendentry if present
  const plotRegex = /\\addplot(3)?\s*\[([\s\S]*?)\]\s*([\s\S]*?)\s*;(?:\s*\\addlegendentry\{([^}]*)\})?/g
  let match: RegExpExecArray | null

  while ((match = plotRegex.exec(body)) !== null) {
    const is3D = match[1] === '3'
    const optsRaw = match[2]
    const content = match[3].trim()
    const legendEntry = match[4] || ''

    const opts = splitOptions(optsRaw)
    const parsedOpts = parsePlotOptions(opts)

    if (is3D) {
      const plot = build3DPlot(parsedOpts, content, legendEntry)
      if (plot) plots.push(plot)
    } else if (content.startsWith('table') || content.startsWith('coordinates')) {
      const plot = buildDataPlot(parsedOpts, content, legendEntry)
      if (plot) plots.push(plot)
    } else {
      // Function expression: {expr}
      const plot = build2DPlot(parsedOpts, content, legendEntry)
      if (plot) plots.push(plot)
    }
  }

  return plots
}

interface ParsedPlotOpts {
  color: string
  lineWidth: number
  lineStyle: 'solid' | 'dashed' | 'dotted'
  mark: PlotSeries['mark']
  domain: [number, number] | null
  yDomain: [number, number] | null
  samples: number
  plotStyle: FunctionPlot3D['plotStyle'] | null
  colormap: FunctionPlot3D['colormap'] | null
  isOnlyMarks: boolean
  isYbar: boolean
}

function parsePlotOptions(opts: string[]): ParsedPlotOpts {
  const result: ParsedPlotOpts = {
    color: '#2563eb',
    lineWidth: 1.5,
    lineStyle: 'solid',
    mark: 'none',
    domain: null,
    yDomain: null,
    samples: 100,
    plotStyle: null,
    colormap: null,
    isOnlyMarks: false,
    isYbar: false,
  }

  for (const opt of opts) {
    const [key, val] = splitKeyVal(opt)

    switch (key) {
      case 'color': result.color = tikzColorToHex(val); break
      case 'blue': result.color = '#0000ff'; break
      case 'red': result.color = '#ff0000'; break
      case 'green': result.color = '#00aa00'; break
      case 'black': result.color = '#000000'; break
      case 'orange': result.color = '#ff8800'; break
      case 'purple': result.color = '#800080'; break
      case 'cyan': result.color = '#00cccc'; break
      case 'magenta': result.color = '#cc00cc'; break
      case 'yellow': result.color = '#cccc00'; break
      case 'brown': result.color = '#8b4513'; break
      case 'gray': case 'grey': result.color = '#888888'; break
      case 'green!70!black': result.color = '#005500'; break
      case 'domain': {
        const parts = val.split(':').map(s => parseFloat(s.trim()))
        if (parts.length === 2 && parts.every(isFinite)) result.domain = parts as [number, number]
        break
      }
      case 'y domain': {
        const parts = val.split(':').map(s => parseFloat(s.trim()))
        if (parts.length === 2 && parts.every(isFinite)) result.yDomain = parts as [number, number]
        break
      }
      case 'samples': {
        const n = parseInt(val)
        if (isFinite(n) && n > 0) result.samples = n
        break
      }
      case 'line width': {
        const w = parseFloat(val)
        if (isFinite(w)) result.lineWidth = w
        break
      }
      case 'thick': result.lineWidth = 1.5; break
      case 'very thick': result.lineWidth = 2; break
      case 'thin': result.lineWidth = 0.8; break
      case 'ultra thick': result.lineWidth = 3; break
      case 'dashed': result.lineStyle = 'dashed'; break
      case 'dotted': result.lineStyle = 'dotted'; break
      case 'mark': {
        const valid: PlotSeries['mark'][] = ['none', '*', 'o', 'x', '+', 'square', 'triangle', 'diamond']
        if (valid.includes(val as PlotSeries['mark'])) result.mark = val as PlotSeries['mark']
        break
      }
      case 'only marks': result.isOnlyMarks = true; break
      case 'ybar': result.isYbar = true; break
      case 'surf': result.plotStyle = 'surf'; break
      case 'mesh': result.plotStyle = 'mesh'; break
      case 'contour': result.plotStyle = 'contour'; break
      case 'colormap name': {
        const valid: FunctionPlot3D['colormap'][] = ['viridis', 'hot', 'cool', 'spring', 'winter', 'jet']
        if (valid.includes(val as FunctionPlot3D['colormap'])) result.colormap = val as FunctionPlot3D['colormap']
        break
      }
    }
  }

  // Handle composite color names that appear as standalone options (e.g. "green!70!black")
  for (const opt of opts) {
    const trimmed = opt.trim()
    if (trimmed.includes('!') && !trimmed.includes('=')) {
      result.color = tikzColorToHex(trimmed)
    }
  }

  return result
}

function build2DPlot(opts: ParsedPlotOpts, content: string, legendEntry: string): FunctionPlot2D | null {
  // Extract expression from {expr}
  const exprMatch = content.match(/^\{([\s\S]*)\}$/)
  if (!exprMatch) return null

  return {
    id: crypto.randomUUID(),
    type: 'function2d',
    color: opts.color,
    lineWidth: opts.lineWidth,
    lineStyle: opts.lineStyle,
    mark: opts.mark,
    legendEntry,
    expression: exprMatch[1].trim(),
    domain: opts.domain ?? [-5, 5],
    samples: opts.samples,
  }
}

function build3DPlot(opts: ParsedPlotOpts, content: string, legendEntry: string): FunctionPlot3D | null {
  const exprMatch = content.match(/^\{([\s\S]*)\}$/)
  if (!exprMatch) return null

  return {
    id: crypto.randomUUID(),
    type: 'function3d',
    color: opts.color,
    lineWidth: opts.lineWidth,
    lineStyle: opts.lineStyle,
    mark: opts.mark,
    legendEntry,
    expression: exprMatch[1].trim(),
    domainX: opts.domain ?? [-3, 3],
    domainY: opts.yDomain ?? [-3, 3],
    samples: opts.samples > 50 ? 25 : opts.samples,
    plotStyle: opts.plotStyle ?? 'surf',
    colormap: opts.colormap ?? 'viridis',
  }
}

function buildDataPlot(opts: ParsedPlotOpts, content: string, legendEntry: string): DataPlot | null {
  let data = ''
  let xColumn = 'x'
  let yColumn = 'y'
  let hasHeader = true

  // coordinates {(x1,y1)(x2,y2)...}
  const coordMatch = content.match(/coordinates\s*\{([\s\S]*)\}/)
  if (coordMatch) {
    const pairs = [...coordMatch[1].matchAll(/\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g)]
    if (pairs.length === 0) return null
    const rows = pairs.map(m => `${m[1].trim()}, ${m[2].trim()}`)
    data = `x, y\n${rows.join('\n')}`
    hasHeader = true
  }

  // table[opts]{data}
  const tableMatch = content.match(/table\s*(?:\[([^\]]*)\])?\s*\{([\s\S]*)\}/)
  if (tableMatch) {
    const tableOpts = tableMatch[1] || ''
    data = tableMatch[2].trim()
    const xMatch = tableOpts.match(/x\s*=\s*(\w+)/)
    const yMatch = tableOpts.match(/y\s*=\s*(\w+)/)
    if (xMatch) xColumn = xMatch[1]
    if (yMatch) yColumn = yMatch[1]
    if (tableOpts.includes('header=false')) hasHeader = false
  }

  if (!data) return null

  let chartType: DataPlot['chartType'] = 'line'
  if (opts.isOnlyMarks) chartType = 'scatter'
  if (opts.isYbar) chartType = 'bar'

  return {
    id: crypto.randomUUID(),
    type: 'data',
    color: opts.color,
    lineWidth: opts.lineWidth,
    lineStyle: opts.lineStyle,
    mark: opts.mark === 'none' && opts.isOnlyMarks ? '*' : opts.mark,
    legendEntry,
    chartType,
    data,
    xColumn,
    yColumn,
    hasHeader,
  }
}

// ── Utility functions ──

/** Split a comma-separated options string, respecting braces and nested brackets */
function splitOptions(raw: string): string[] {
  const results: string[] = []
  let depth = 0
  let current = ''

  for (const ch of raw) {
    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') depth--

    if (ch === ',' && depth === 0) {
      const trimmed = current.trim()
      if (trimmed) results.push(trimmed)
      current = ''
    } else {
      current += ch
    }
  }

  const trimmed = current.trim()
  if (trimmed) results.push(trimmed)

  return results
}

/** Split "key=value" or "key = {value}" — standalone keys return [key, ''] */
function splitKeyVal(opt: string): [string, string] {
  const eqIdx = opt.indexOf('=')
  if (eqIdx < 0) return [opt.trim(), '']
  return [opt.slice(0, eqIdx).trim(), stripBraces(opt.slice(eqIdx + 1).trim())]
}

/** Remove outer braces: "{foo}" → "foo" */
function stripBraces(s: string): string {
  if (s.startsWith('{') && s.endsWith('}')) return s.slice(1, -1)
  return s
}

/** Best-effort conversion of a tikz/xcolor color spec to hex */
function tikzColorToHex(color: string): string {
  const c = color.trim()

  // Named colors
  const named: Record<string, string> = {
    blue: '#0000ff',
    red: '#ff0000',
    green: '#00aa00',
    black: '#000000',
    white: '#ffffff',
    orange: '#ff8800',
    purple: '#800080',
    cyan: '#00cccc',
    magenta: '#cc00cc',
    yellow: '#cccc00',
    brown: '#8b4513',
    gray: '#888888',
    grey: '#888888',
    lightgray: '#cccccc',
    darkgray: '#555555',
    violet: '#8000ff',
    pink: '#ff69b4',
    olive: '#808000',
    teal: '#008080',
  }

  if (named[c]) return named[c]

  // Already hex
  if (c.startsWith('#')) return c

  // {rgb,255:red,R;green,G;blue,B}
  const rgbMatch = c.match(/rgb,255\s*:\s*red\s*,\s*(\d+)\s*;\s*green\s*,\s*(\d+)\s*;\s*blue\s*,\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1])
    const g = parseInt(rgbMatch[2])
    const b = parseInt(rgbMatch[3])
    return `#${hex(r)}${hex(g)}${hex(b)}`
  }

  // color!N!mix pattern (e.g., "green!70!black")
  const mixMatch = c.match(/^(\w+)!(\d+)!(\w+)$/)
  if (mixMatch) {
    const c1 = named[mixMatch[1]] || '#000000'
    const c2 = named[mixMatch[3]] || '#000000'
    const pct = parseInt(mixMatch[2]) / 100
    return blendColors(c1, c2, pct)
  }

  return '#2563eb' // fallback
}

function hex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
}

function blendColors(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16)
  const r = Math.round(r1 * t + r2 * (1 - t))
  const g = Math.round(g1 * t + g2 * (1 - t))
  const b = Math.round(b1 * t + b2 * (1 - t))
  return `#${hex(r)}${hex(g)}${hex(b)}`
}
