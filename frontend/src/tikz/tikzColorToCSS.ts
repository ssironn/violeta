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
