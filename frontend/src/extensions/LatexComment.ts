import { Node } from '@tiptap/core'

/**
 * Hidden node that preserves LaTeX comments (% lines) in the document model
 * without rendering them in the editor. Comments are round-tripped back to
 * LaTeX on export.
 */
export const LatexComment = Node.create({
  name: 'latexComment',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="latex-comment"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'latex-comment' }]
  },

  addNodeView() {
    return () => {
      const dom = document.createElement('div')
      dom.style.display = 'none'
      return { dom }
    }
  },
})
