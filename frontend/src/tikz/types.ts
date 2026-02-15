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
