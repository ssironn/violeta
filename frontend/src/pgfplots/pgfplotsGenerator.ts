import type { PgfplotConfig, PlotSeries, AxisConfig, FunctionPlot2D, FunctionPlot3D, DataPlot } from './types'

/** Convert hex color to PGFPlots-compatible xcolor spec */
function colorToTikz(hex: string): string {
  if (!hex || hex === 'none') return 'blue'
  if (!hex.startsWith('#')) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `{rgb,255:red,${r};green,${g};blue,${b}}`
}

function buildAxisOptions(axis: AxisConfig): string[] {
  const opts: string[] = []

  if (axis.title) opts.push(`title={${axis.title}}`)
  if (axis.xlabel) opts.push(`xlabel={${axis.xlabel}}`)
  if (axis.ylabel) opts.push(`ylabel={${axis.ylabel}}`)
  if (axis.xmin) opts.push(`xmin=${axis.xmin}`)
  if (axis.xmax) opts.push(`xmax=${axis.xmax}`)
  if (axis.ymin) opts.push(`ymin=${axis.ymin}`)
  if (axis.ymax) opts.push(`ymax=${axis.ymax}`)
  if (axis.showGrid !== false && axis.grid !== 'none') opts.push(`grid=${axis.grid}`)
  if (axis.showAxis === false) opts.push('hide axis')
  if (axis.backgroundColor) opts.push(`axis background/.style={fill=${colorToTikz(axis.backgroundColor)}}`)
  if (axis.width) opts.push(`width=${axis.width}`)
  if (axis.height) opts.push(`height=${axis.height}`)

  // Draw x=0 and y=0 axis lines (thin, light gray)
  if (axis.showAxis !== false) {
    opts.push('extra x ticks={0}')
    opts.push('extra x tick labels={}')
    opts.push('extra x tick style={grid=major, grid style={black!40, line width=0.2mm}}')
    opts.push('extra y ticks={0}')
    opts.push('extra y tick labels={}')
    opts.push('extra y tick style={grid=major, grid style={black!40, line width=0.2mm}}')
  }

  return opts
}

function buildPlotOptions(plot: PlotSeries): string[] {
  const opts: string[] = []

  opts.push(`color=${colorToTikz(plot.color)}`)

  if (plot.lineWidth !== 1.5) {
    opts.push(`line width=${plot.lineWidth}pt`)
  } else {
    opts.push('thick')
  }

  if (plot.lineStyle === 'dashed') opts.push('dashed')
  if (plot.lineStyle === 'dotted') opts.push('dotted')

  if (plot.mark !== 'none') {
    opts.push(`mark=${plot.mark}`)
  }

  return opts
}

/** Normalize math expression to PGF-compatible syntax */
function normalizeToPgf(expr: string): string {
  // log() → ln() (PGF uses ln for natural logarithm; log is not defined)
  // Preserve log2() and log10() which are valid in PGF
  return expr.replace(/\blog(?!2|10)(\s*\()/g, 'ln$1')
}

function generateFunction2D(plot: FunctionPlot2D): string {
  const opts = buildPlotOptions(plot)
  opts.push(`domain=${plot.domain[0]}:${plot.domain[1]}`)
  opts.push(`samples=${plot.samples}`)

  const expr = normalizeToPgf(plot.expression)
  const lines: string[] = []
  lines.push(`  \\addplot[${opts.join(', ')}] {${expr}};`)
  if (plot.legendEntry) {
    lines.push(`  \\addlegendentry{${plot.legendEntry}}`)
  }
  return lines.join('\n')
}

function generateFunction3D(plot: FunctionPlot3D): string {
  const opts = buildPlotOptions(plot)
  opts.push(`domain=${plot.domainX[0]}:${plot.domainX[1]}`)
  opts.push(`y domain=${plot.domainY[0]}:${plot.domainY[1]}`)
  opts.push(`samples=${plot.samples}`)
  opts.push(plot.plotStyle)
  if (plot.colormap !== 'viridis') {
    opts.push(`colormap name=${plot.colormap}`)
  }

  const expr = normalizeToPgf(plot.expression)
  const lines: string[] = []
  lines.push(`  \\addplot3[${opts.join(', ')}] {${expr}};`)
  if (plot.legendEntry) {
    lines.push(`  \\addlegendentry{${plot.legendEntry}}`)
  }
  return lines.join('\n')
}

function generateDataPlot(plot: DataPlot): string {
  const opts = buildPlotOptions(plot)

  if (plot.chartType === 'scatter') {
    opts.push('only marks')
  } else if (plot.chartType === 'bar') {
    opts.push('ybar')
  }

  const lines: string[] = []
  lines.push(`  \\addplot[${opts.join(', ')}] table[x=${plot.xColumn}, y=${plot.yColumn}, col sep=comma${plot.hasHeader ? '' : ', header=false'}] {`)

  // Indent the CSV data
  const dataLines = plot.data.trim().split('\n')
  for (const line of dataLines) {
    lines.push(`    ${line.trim()}`)
  }

  lines.push('  };')
  if (plot.legendEntry) {
    lines.push(`  \\addlegendentry{${plot.legendEntry}}`)
  }
  return lines.join('\n')
}

function generatePlotCode(plot: PlotSeries): string {
  switch (plot.type) {
    case 'function2d': return generateFunction2D(plot)
    case 'function3d': return generateFunction3D(plot)
    case 'data': return generateDataPlot(plot)
  }
}

export function generatePgfplotsCode(config: PgfplotConfig): string {
  if (config.plots.length === 0) {
    return '\\begin{tikzpicture}\n\\begin{axis}\n\\end{axis}\n\\end{tikzpicture}'
  }

  const axisOpts = buildAxisOptions(config.axis)

  // Check if any plot is 3D
  const has3D = config.plots.some(p => p.type === 'function3d')

  // Add legend position if any plot has a legend
  const hasLegend = config.plots.some(p => p.legendEntry)
  if (hasLegend) {
    axisOpts.push(`legend pos=${config.axis.legendPos}`)
  }

  const plotLines = config.plots.map(generatePlotCode).join('\n')

  const axisEnv = has3D ? 'axis' : 'axis'
  const axisOptsStr = axisOpts.length > 0
    ? `[${axisOpts.join(',\n    ')}]`
    : ''

  return `\\begin{tikzpicture}
\\begin{${axisEnv}}${axisOptsStr}
${plotLines}
\\end{${axisEnv}}
\\end{tikzpicture}`
}
