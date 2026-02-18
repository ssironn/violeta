import { describe, it, expect } from 'vitest'
import { parseLatex } from '../parseLatex'
import { generateLatex } from '../generateLatex'

describe('round-trip: parse → generate', () => {
  it('round-trips \\chapter{Title}', () => {
    const input = '\\chapter{Introduction}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\chapter{Introduction}')
  })

  it('round-trips \\part*{Title}', () => {
    const input = '\\part*{Appendix}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\part*{Appendix}')
  })

  it('round-trips \\title{X}', () => {
    const input = '\\title{My Doc}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\title{My Doc}')
  })

  it('round-trips description list with item labels', () => {
    const input = `\\begin{description}
\\item[Alpha] First item
\\item[Beta] Second item
\\end{description}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\item[Alpha]')
    expect(output).toContain('\\item[Beta]')
  })

  it('round-trips \\section unchanged', () => {
    const input = '\\section{Hello}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\section{Hello}')
  })
})
