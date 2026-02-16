import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
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
      textAlign: {
        default: 'left',
        renderHTML: (attributes: Record<string, unknown>) => {
          return { style: `text-align: ${attributes.textAlign}` }
        },
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
      // Wrapper for alignment
      const dom = document.createElement('div')
      dom.classList.add('block-card-wrapper')

      const card = document.createElement('div')
      card.classList.add('raw-latex-block')
      dom.appendChild(card)

      // Label
      const label = document.createElement('div')
      label.classList.add('raw-latex-label')
      label.textContent = 'LaTeX'
      card.appendChild(label)

      // KaTeX preview
      const preview = document.createElement('div')
      preview.classList.add('raw-latex-preview')
      card.appendChild(preview)

      // Textarea
      const textarea = document.createElement('textarea')
      textarea.classList.add('raw-latex-textarea')
      textarea.value = node.attrs.content as string
      card.appendChild(textarea)

      function stripMathDelimiters(latex: string): { math: string; displayMode: boolean } {
        const trimmed = latex.trim()
        // $$...$$ or \[...\] → display mode
        if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
          return { math: trimmed.slice(2, -2).trim(), displayMode: true }
        }
        if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
          return { math: trimmed.slice(2, -2).trim(), displayMode: true }
        }
        // $...$ or \(...\) → inline mode
        if (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 1) {
          return { math: trimmed.slice(1, -1).trim(), displayMode: false }
        }
        if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
          return { math: trimmed.slice(2, -2).trim(), displayMode: false }
        }
        // \begin{...}...\end{...} → display mode, pass as-is
        if (trimmed.startsWith('\\begin{')) {
          return { math: trimmed, displayMode: true }
        }
        // No delimiters — treat as display math
        return { math: trimmed, displayMode: true }
      }

      function renderPreview(latex: string) {
        if (!latex.trim()) {
          preview.innerHTML = '<span class="raw-latex-placeholder">Digite LaTeX aqui...</span>'
          return
        }
        try {
          const { math, displayMode } = stripMathDelimiters(latex)
          preview.innerHTML = katex.renderToString(math, {
            displayMode,
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

      function applyAlignment(n: ProseMirrorNode) {
        const align = (n.attrs.textAlign as string) || 'left'
        dom.style.textAlign = align
      }

      // Initial render
      renderPreview(node.attrs.content as string)
      applyAlignment(node)

      // Auto-resize after the textarea is in the DOM
      requestAnimationFrame(() => {
        autoResize()
      })

      // Clicking on the preview selects the node for editing
      preview.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const pos = getPos()
        if (pos != null) {
          const tr = editor.view.state.tr
          const selection = NodeSelection.create(editor.view.state.doc, pos)
          editor.view.dispatch(tr.setSelection(selection))
        }
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
          applyAlignment(updatedNode)
          return true
        },

        selectNode() {
          card.classList.add('selected')
          textarea.focus()
          requestAnimationFrame(() => autoResize())
        },

        deselectNode() {
          card.classList.remove('selected')
        },

        stopEvent(event: Event) {
          // Only intercept events when in edit mode (selected),
          // otherwise let ProseMirror handle clicks to create NodeSelection
          if (!card.classList.contains('selected')) {
            return false
          }
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
