import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    latexSpacing: {
      insertLatexSpacing: (attrs: { command: string; label: string; size: number }) => ReturnType
    }
  }
}

/**
 * Inline node representing a LaTeX spacing command.
 * Renders as a visible "pill" in the editor and emits the raw command in LaTeX output.
 */
export const LatexSpacing = Node.create({
  name: 'latexSpacing',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      command: { default: '\\quad' },
      label: { default: '1em' },
      size: { default: 1 },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="latex-spacing"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'latex-spacing' })]
  },

  addCommands() {
    return {
      insertLatexSpacing:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.classList.add('latex-spacing-node')
      dom.setAttribute('data-command', node.attrs.command)
      dom.contentEditable = 'false'

      // Visual indicator: a pill showing the spacing type
      const pill = document.createElement('span')
      pill.classList.add('latex-spacing-pill')
      pill.textContent = node.attrs.label
      dom.appendChild(pill)

      // Actual visual space
      const spacer = document.createElement('span')
      spacer.classList.add('latex-spacing-spacer')
      spacer.style.width = `${node.attrs.size}em`
      dom.appendChild(spacer)

      return { dom }
    }
  },
})

/** All available spacing commands for the UI */
export const SPACING_OPTIONS = [
  { command: '\\,', label: '3mu', size: 0.17, description: 'Espaço fino (\\,)' },
  { command: '\\:', label: '4mu', size: 0.22, description: 'Espaço médio (\\:)' },
  { command: '\\;', label: '5mu', size: 0.28, description: 'Espaço grosso (\\;)' },
  { command: '\\!', label: '-3mu', size: -0.17, description: 'Espaço negativo (\\!)' },
  { command: '\\quad', label: '1em', size: 1, description: 'Quad (\\quad)' },
  { command: '\\qquad', label: '2em', size: 2, description: 'Double quad (\\qquad)' },
  { command: '\\hfill', label: 'fill', size: 3, description: 'Preencher (\\hfill)' },
  { command: '\\smallskip', label: 'skip', size: 0.5, description: 'Pulo pequeno (\\smallskip)' },
  { command: '\\medskip', label: 'skip', size: 1, description: 'Pulo médio (\\medskip)' },
  { command: '\\bigskip', label: 'skip', size: 1.5, description: 'Pulo grande (\\bigskip)' },
]
