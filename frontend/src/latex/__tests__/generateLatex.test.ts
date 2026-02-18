import { describe, it, expect } from 'vitest'
import { generateLatex } from '../generateLatex'

describe('generateLatex — chapter/part round-trip', () => {
  it('generates \\chapter from heading level 0 with sourceCommand=chapter', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0, starred: false, sourceCommand: 'chapter' },
        content: [{ type: 'text', text: 'Introduction' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\chapter{Introduction}')
  })

  it('generates \\chapter* for starred heading', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0, starred: true, sourceCommand: 'chapter' },
        content: [{ type: 'text', text: 'No Number' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\chapter*{No Number}')
  })

  it('generates \\part from heading level 0 with sourceCommand=part', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0, starred: false, sourceCommand: 'part' },
        content: [{ type: 'text', text: 'First Part' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\part{First Part}')
  })

  it('defaults level 0 without sourceCommand to \\chapter', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0, starred: false },
        content: [{ type: 'text', text: 'Default' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\chapter{Default}')
  })

  it('preserves \\section for level 1 unchanged', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 1, starred: false },
        content: [{ type: 'text', text: 'Section' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\section{Section}')
  })
})
