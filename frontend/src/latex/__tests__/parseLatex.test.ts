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

describe('parseLatex — CONTENT_DISPLAY_COMMANDS', () => {
  it('extracts \\title{X} content as paragraph with sourceCommand mark', () => {
    const doc = parseLatex('\\title{My Document}')
    const para = doc.content![0]
    expect(para.type).toBe('paragraph')
    const textNode = para.content![0]
    expect(textNode.text).toBe('My Document')
    const srcMark = textNode.marks?.find((m: any) => m.type === 'sourceCommand')
    expect(srcMark).toBeDefined()
    expect(srcMark!.attrs!.command).toBe('title')
  })

  it('extracts \\author{X} content with sourceCommand mark', () => {
    const doc = parseLatex('\\author{John Doe}')
    const para = doc.content![0]
    const textNode = para.content![0]
    expect(textNode.text).toBe('John Doe')
    const srcMark = textNode.marks?.find((m: any) => m.type === 'sourceCommand')
    expect(srcMark!.attrs!.command).toBe('author')
  })

  it('extracts \\textsc{X} content with sourceCommand mark', () => {
    const doc = parseLatex('Hello \\textsc{Small Caps} world')
    const para = doc.content![0]
    const scNode = para.content!.find((n: any) =>
      n.marks?.some((m: any) => m.type === 'sourceCommand')
    )
    expect(scNode).toBeDefined()
    expect(scNode!.text).toBe('Small Caps')
  })
})

describe('parseLatex — inline math edge cases', () => {
  it('does not close inline math on escaped \\$', () => {
    const doc = parseLatex('$x = \\$5$ rest')
    const para = doc.content![0]
    const mathNode = para.content!.find((n: any) => n.type === 'inlineMath')
    expect(mathNode).toBeDefined()
    expect(mathNode!.attrs!.latex).toBe('x = \\$5')
  })

  it('handles multiple escaped dollars in math', () => {
    const doc = parseLatex('$\\$a + \\$b$')
    const para = doc.content![0]
    const mathNode = para.content!.find((n: any) => n.type === 'inlineMath')
    expect(mathNode).toBeDefined()
    expect(mathNode!.attrs!.latex).toBe('\\$a + \\$b')
  })
})

describe('parseLatex — brace matching edge cases', () => {
  it('closes brace group after \\\\\\\\ (double backslash line break)', () => {
    // Raw LaTeX: \textbf{line one \\ line two}
    // In JS: need 4 backslashes to represent \\
    const doc = parseLatex('\\textbf{line one \\\\\\\\ line two}')
    const para = doc.content![0]
    expect(para.type).toBe('paragraph')
    // The bold should contain both lines
    const boldNodes = para.content!.filter(
      (n: any) => n.type === 'text' && n.marks?.some((m: any) => m.type === 'bold')
    )
    expect(boldNodes.length).toBeGreaterThan(0)
  })

  it('handles \\textbf{x\\\\\\\\} without eating following content', () => {
    // Raw LaTeX: \textbf{x\\} next
    // The } after \\ should close the group, not be "escaped"
    const doc = parseLatex('\\textbf{x\\\\\\\\} next')
    const para = doc.content![0]
    const textNodes = para.content!.filter((n: any) => n.type === 'text')
    const allText = textNodes.map((n: any) => n.text).join('')
    expect(allText).toContain('next')
    // "next" must NOT be bold — it's outside the braces
    const nextNode = textNodes.find((n: any) => n.text?.includes('next'))
    expect(nextNode).toBeDefined()
    const hasBold = nextNode!.marks?.some((m: any) => m.type === 'bold')
    expect(hasBold).toBeFalsy()
  })
})
