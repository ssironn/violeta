import { describe, it, expect } from 'vitest'
import { generateLatex } from '../generateLatex'

describe('generateLatex — heading levels as \\section commands', () => {
  it('generates \\section{...} for level 1', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Section' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\section{Section}')
  })

  it('generates \\subsection{...} for level 2', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Subsection' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\subsection{Subsection}')
  })

  it('generates \\subsubsection{...} for level 3', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Subsubsection' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\subsubsection{Subsubsection}')
  })

  it('generates \\paragraph{...} for level 4', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 4 },
        content: [{ type: 'text', text: 'Paragraph' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\paragraph{Paragraph}')
  })

  it('generates \\chapter{...} for level 0', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0 },
        content: [{ type: 'text', text: 'Chapter' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\chapter{Chapter}')
  })

  it('generates starred variant \\section*{...}', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 1, starred: true },
        content: [{ type: 'text', text: 'Unnumbered' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\section*{Unnumbered}')
  })

  it('does not wrap heading in center (sections are never centered)', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 1, textAlign: 'center' },
        content: [{ type: 'text', text: 'Title' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\section{Title}')
    expect(latex).not.toContain('\\begin{center}')
  })
})

describe('generateLatex — CONTENT_DISPLAY_COMMANDS round-trip', () => {
  it('wraps text with sourceCommand mark back in \\title{}', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'My Document',
          marks: [{ type: 'sourceCommand', attrs: { command: 'title' } }],
        }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\title{My Document}')
  })

  it('wraps text with sourceCommand mark back in \\textsc{}', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello ' },
          {
            type: 'text',
            text: 'Small Caps',
            marks: [{ type: 'sourceCommand', attrs: { command: 'textsc' } }],
          },
          { type: 'text', text: ' world' },
        ],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('Hello \\textsc{Small Caps} world')
  })
})
