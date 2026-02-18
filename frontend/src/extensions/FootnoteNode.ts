import { Node, mergeAttributes } from '@tiptap/core'

export const FootnoteNode = Node.create({
  name: 'footnote',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="footnote"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'footnote' })]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span')
      dom.classList.add('footnote-marker')
      dom.setAttribute('data-type', 'footnote')

      // Superscript marker
      const marker = document.createElement('sup')
      marker.classList.add('footnote-sup')
      marker.textContent = '*'
      dom.appendChild(marker)

      // Tooltip with content
      const tooltip = document.createElement('span')
      tooltip.classList.add('footnote-tooltip')
      tooltip.textContent = node.attrs.content as string
      dom.appendChild(tooltip)

      dom.addEventListener('click', (e) => {
        e.preventDefault()
        const pos = getPos()
        if (pos != null) {
          const content = prompt('Nota de rodapé:', node.attrs.content as string)
          if (content !== null) {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, { content })
            )
          }
        }
      })

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'footnote') return false
          tooltip.textContent = updatedNode.attrs.content as string
          return true
        },
      }
    }
  },
})
