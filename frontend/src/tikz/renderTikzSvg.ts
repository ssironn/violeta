import type { TikzShape } from './types'
import { tikzColorToCSS } from './tikzColorToCSS'

const SCALE = 40
const SVG_NS = 'http://www.w3.org/2000/svg'

function toSvgX(x: number): number {
  return x * SCALE
}

function toSvgY(y: number): number {
  return -y * SCALE
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

function svgAttrs(shape: TikzShape): { fill: string; stroke: string; strokeWidth: number; strokeDasharray?: string } {
  const fill = tikzColorToCSS(shape.fill ?? '')
  const stroke = tikzColorToCSS(shape.stroke ?? 'black')
  const strokeWidth = (shape.lineWidth ?? 0.4) * SCALE * 0.05

  let strokeDasharray: string | undefined
  if (shape.lineStyle === 'dashed') {
    strokeDasharray = `${strokeWidth * 4} ${strokeWidth * 3}`
  } else if (shape.lineStyle === 'dotted') {
    strokeDasharray = `${strokeWidth} ${strokeWidth * 2}`
  }

  return { fill, stroke, strokeWidth, strokeDasharray }
}

function setCommonAttrs(el: SVGElement, attrs: ReturnType<typeof svgAttrs>, shape: TikzShape) {
  el.setAttribute('fill', attrs.fill)
  el.setAttribute('stroke', attrs.stroke)
  el.setAttribute('stroke-width', String(attrs.strokeWidth))
  if (attrs.strokeDasharray) {
    el.setAttribute('stroke-dasharray', attrs.strokeDasharray)
  }
  const cx = shape.position.x
  const cy = shape.position.y
  if (shape.rotation) {
    el.setAttribute('transform', `rotate(${-shape.rotation} ${toSvgX(cx)} ${toSvgY(cy)})`)
  }
  if (shape.shadow) {
    el.setAttribute('filter', 'url(#shadow)')
  }
}

function renderShapeElement(shape: TikzShape): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g')
  g.style.opacity = String(shape.opacity ?? 1)

  const attrs = svgAttrs(shape)
  const cx = shape.position.x
  const cy = shape.position.y

  let el: SVGElement

  switch (shape.type) {
    case 'circle': {
      el = document.createElementNS(SVG_NS, 'circle')
      el.setAttribute('cx', String(toSvgX(cx)))
      el.setAttribute('cy', String(toSvgY(cy)))
      el.setAttribute('r', String(shape.radius * SCALE))
      break
    }
    case 'rectangle': {
      el = document.createElementNS(SVG_NS, 'rect')
      const w = shape.width * SCALE
      const h = shape.height * SCALE
      el.setAttribute('x', String(toSvgX(cx) - w / 2))
      el.setAttribute('y', String(toSvgY(cy) - h / 2))
      el.setAttribute('width', String(w))
      el.setAttribute('height', String(h))
      break
    }
    case 'square': {
      el = document.createElementNS(SVG_NS, 'rect')
      const s = shape.side * SCALE
      el.setAttribute('x', String(toSvgX(cx) - s / 2))
      el.setAttribute('y', String(toSvgY(cy) - s / 2))
      el.setAttribute('width', String(s))
      el.setAttribute('height', String(s))
      break
    }
    case 'triangle': {
      el = document.createElementNS(SVG_NS, 'polygon')
      const hb = shape.base / 2
      const h = shape.height
      const points = [
        `${toSvgX(cx)},${toSvgY(cy + h)}`,
        `${toSvgX(cx - hb)},${toSvgY(cy)}`,
        `${toSvgX(cx + hb)},${toSvgY(cy)}`,
      ].join(' ')
      el.setAttribute('points', points)
      break
    }
    case 'regular-polygon': {
      el = document.createElementNS(SVG_NS, 'polygon')
      const points: string[] = []
      for (let i = 0; i < shape.sides; i++) {
        const angle = (2 * Math.PI * i) / shape.sides - Math.PI / 2
        const px = toSvgX(cx) + shape.radius * SCALE * Math.cos(angle)
        const py = toSvgY(cy) + shape.radius * SCALE * Math.sin(angle)
        points.push(`${px},${py}`)
      }
      el.setAttribute('points', points.join(' '))
      break
    }
    case 'custom-polygon': {
      el = document.createElementNS(SVG_NS, 'polygon')
      const points = shape.vertices
        .map((v) => `${toSvgX(cx + v.x)},${toSvgY(cy + v.y)}`)
        .join(' ')
      el.setAttribute('points', points)
      break
    }
  }

  setCommonAttrs(el, attrs, shape)
  g.appendChild(el)

  if (shape.label) {
    const text = document.createElementNS(SVG_NS, 'text')
    text.setAttribute('x', String(toSvgX(cx)))
    text.setAttribute('y', String(toSvgY(cy)))
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('dominant-baseline', 'central')
    text.setAttribute('fill', 'currentColor')
    text.setAttribute('font-size', '12')
    if (shape.rotation) {
      text.setAttribute('transform', `rotate(${-shape.rotation} ${toSvgX(cx)} ${toSvgY(cy)})`)
    }
    text.textContent = shape.label
    g.appendChild(text)
  }

  return g
}

/**
 * Renders TikZ shapes into a container element as an inline SVG.
 * Pure DOM — no React dependency.
 */
export function renderTikzSvg(container: HTMLElement, shapes: TikzShape[], width = 400, height = 280): void {
  container.innerHTML = ''

  if (shapes.length === 0) return

  // Compute viewBox from shape bounds
  const padding = 1.5
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const shape of shapes) {
    const bounds = getShapeBounds(shape)
    if (bounds.minX < minX) minX = bounds.minX
    if (bounds.minY < minY) minY = bounds.minY
    if (bounds.maxX > maxX) maxX = bounds.maxX
    if (bounds.maxY > maxY) maxY = bounds.maxY
  }

  const svgMinX = toSvgX(minX - padding)
  const svgMinY = toSvgY(maxY + padding)
  const svgWidth = (maxX - minX + padding * 2) * SCALE
  const svgHeight = (maxY - minY + padding * 2) * SCALE

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `${svgMinX} ${svgMinY} ${svgWidth} ${svgHeight}`)
  svg.style.display = 'block'

  // Shadow filter
  const defs = document.createElementNS(SVG_NS, 'defs')
  const filter = document.createElementNS(SVG_NS, 'filter')
  filter.setAttribute('id', 'shadow')
  filter.setAttribute('x', '-20%')
  filter.setAttribute('y', '-20%')
  filter.setAttribute('width', '140%')
  filter.setAttribute('height', '140%')
  const shadow = document.createElementNS(SVG_NS, 'feDropShadow')
  shadow.setAttribute('dx', '2')
  shadow.setAttribute('dy', '2')
  shadow.setAttribute('stdDeviation', '3')
  shadow.setAttribute('flood-opacity', '0.4')
  filter.appendChild(shadow)
  defs.appendChild(filter)
  svg.appendChild(defs)

  // Render shapes
  for (const shape of shapes) {
    svg.appendChild(renderShapeElement(shape))
  }

  const wrapper = document.createElement('div')
  wrapper.style.background = 'rgba(0,0,0,0.08)'
  wrapper.style.borderRadius = '0.75rem'
  wrapper.style.border = '1px solid rgba(0,0,0,0.04)'
  wrapper.appendChild(svg)
  container.appendChild(wrapper)
}
