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
