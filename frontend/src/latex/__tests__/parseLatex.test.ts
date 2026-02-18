import { describe, it, expect } from 'vitest'
import { parseLatex } from '../parseLatex'

describe('parseLatex — chapter/part headings', () => {
  it('parses \\chapter{Title} as heading level 0', () => {
    const doc = parseLatex('\\chapter{Introduction}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.attrs?.sourceCommand).toBe('chapter')
    expect(heading.content![0].text).toBe('Introduction')
  })

  it('parses \\chapter*{Title} as starred heading level 0', () => {
    const doc = parseLatex('\\chapter*{No Number}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.attrs?.starred).toBe(true)
    expect(heading.attrs?.sourceCommand).toBe('chapter')
  })

  it('parses \\part{Title} as heading level 0 with sourceCommand=part', () => {
    const doc = parseLatex('\\part{First Part}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.attrs?.sourceCommand).toBe('part')
    expect(heading.content![0].text).toBe('First Part')
  })

  it('preserves existing \\section behavior unchanged', () => {
    const doc = parseLatex('\\section{Hello}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(1)
  })

  it('handles \\chapter with inline formatting', () => {
    const doc = parseLatex('\\chapter{\\textbf{Bold} Title}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.content!.length).toBeGreaterThan(0)
  })
})
