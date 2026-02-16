export type PlotType = 'function2d' | 'function3d' | 'data'

export interface AxisConfig {
  title: string
  xlabel: string
  ylabel: string
  xmin: string
  xmax: string
  ymin: string
  ymax: string
  grid: 'none' | 'major' | 'minor' | 'both'
  legendPos: 'north east' | 'north west' | 'south east' | 'south west' | 'outer north east'
  width: string
  height: string
}

export interface PlotSeriesBase {
  id: string
  type: PlotType
  color: string
  lineWidth: number
  lineStyle: 'solid' | 'dashed' | 'dotted'
  mark: 'none' | '*' | 'o' | 'x' | '+' | 'square' | 'triangle' | 'diamond'
  legendEntry: string
}

export interface FunctionPlot2D extends PlotSeriesBase {
  type: 'function2d'
  expression: string
  domain: [number, number]
  samples: number
}

export interface FunctionPlot3D extends PlotSeriesBase {
  type: 'function3d'
  expression: string
  domainX: [number, number]
  domainY: [number, number]
  samples: number
  plotStyle: 'surf' | 'mesh' | 'contour'
  colormap: 'viridis' | 'hot' | 'cool' | 'spring' | 'winter' | 'jet'
}

export interface DataPlot extends PlotSeriesBase {
  type: 'data'
  chartType: 'line' | 'scatter' | 'bar'
  data: string
  xColumn: string
  yColumn: string
  hasHeader: boolean
}

export type PlotSeries = FunctionPlot2D | FunctionPlot3D | DataPlot

export interface PgfplotConfig {
  axis: AxisConfig
  plots: PlotSeries[]
}

export function createDefaultAxisConfig(): AxisConfig {
  return {
    title: '',
    xlabel: '',
    ylabel: '',
    xmin: '',
    xmax: '',
    ymin: '',
    ymax: '',
    grid: 'major',
    legendPos: 'north east',
    width: '10cm',
    height: '7cm',
  }
}

export function createDefaultPlot(type: PlotType): PlotSeries {
  const base: PlotSeriesBase = {
    id: crypto.randomUUID(),
    type,
    color: '#2563eb',
    lineWidth: 1.5,
    lineStyle: 'solid',
    mark: 'none',
    legendEntry: '',
  }

  switch (type) {
    case 'function2d':
      return {
        ...base,
        type: 'function2d',
        expression: 'x^2',
        domain: [-5, 5] as [number, number],
        samples: 100,
      }
    case 'function3d':
      return {
        ...base,
        type: 'function3d',
        expression: 'sin(deg(x)) * cos(deg(y))',
        domainX: [-3, 3] as [number, number],
        domainY: [-3, 3] as [number, number],
        samples: 25,
        plotStyle: 'surf',
        colormap: 'viridis',
      }
    case 'data':
      return {
        ...base,
        type: 'data',
        chartType: 'line',
        data: 'x, y\n0, 0\n1, 1\n2, 4\n3, 9\n4, 16',
        xColumn: 'x',
        yColumn: 'y',
        hasHeader: true,
      }
  }
}

export function createDefaultPgfplotConfig(): PgfplotConfig {
  return {
    axis: createDefaultAxisConfig(),
    plots: [],
  }
}
