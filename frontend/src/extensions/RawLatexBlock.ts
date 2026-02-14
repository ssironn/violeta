import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import katex from 'katex'
import { katexMacros } from '../latex/katexMacros'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    rawLatex: {
      insertRawLatex: () => ReturnType
    }
  }
}

export const RawLatexBlock = Node.create({
  name: 'rawLatex',

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
        tag: 'div[data-type="raw-latex"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'raw-latex' })]
  },

  addCommands() {
    return {
      insertRawLatex:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content: '' },
          })
        },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      // Wrapper
      const dom = document.createElement('div')
      dom.classList.add('raw-latex-block')

      // Label
      const label = document.createElement('div')
      label.classList.add('raw-latex-label')
      label.textContent = 'LaTeX'
      dom.appendChild(label)

      // KaTeX preview
      const preview = document.createElement('div')
      preview.classList.add('raw-latex-preview')
      dom.appendChild(preview)

      // Textarea
      const textarea = document.createElement('textarea')
      textarea.classList.add('raw-latex-textarea')
      textarea.value = node.attrs.content as string
      dom.appendChild(textarea)

      function renderPreview(latex: string) {
        if (!latex.trim()) {
          preview.innerHTML = '<span class="raw-latex-placeholder">Digite LaTeX aqui...</span>'
          return
        }
        try {
          preview.innerHTML = katex.renderToString(latex, {
            displayMode: true,
            throwOnError: false,
            macros: { ...katexMacros },
            errorColor: '#7a6299',
          })
        } catch {
          preview.textContent = latex
        }
      }

      function autoResize() {
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
      }

      // Initial render
      renderPreview(node.attrs.content as string)

      // Auto-resize after the textarea is in the DOM
      requestAnimationFrame(() => {
        autoResize()
      })

      // Prevent editor blur when clicking in the textarea
      textarea.addEventListener('mousedown', (e) => {
        e.stopPropagation()
      })

      textarea.addEventListener('input', () => {
        const value = textarea.value
        renderPreview(value)
        autoResize()

        const pos = getPos()
        if (pos != null) {
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              content: value,
            }),
          )
        }
      })

      return {
        dom,

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'rawLatex') {
            return false
          }
          const newContent = updatedNode.attrs.content as string
          if (textarea.value !== newContent) {
            textarea.value = newContent
            renderPreview(newContent)
            autoResize()
          }
          return true
        },

        selectNode() {
          dom.classList.add('selected')
          textarea.focus()
        },

        deselectNode() {
          dom.classList.remove('selected')
        },

        stopEvent(event: Event) {
          return dom.contains(event.target as HTMLElement)
        },

        ignoreMutation() {
          return true
        },

        destroy() {
          // Nothing to clean up
        },
      }
    }
  },
})
