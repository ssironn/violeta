import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import katex from 'katex'
import { katexMacros } from '../latex/katexMacros'

export const MATH_ENV_OPTIONS = [
  { value: 'equation', label: 'Equation' },
  { value: 'equation*', label: 'Equation*' },
  { value: 'align', label: 'Align' },
  { value: 'align*', label: 'Align*' },
  { value: 'gather', label: 'Gather' },
  { value: 'gather*', label: 'Gather*' },
  { value: 'multline', label: 'Multline' },
  { value: 'multline*', label: 'Multline*' },
  { value: 'cases', label: 'Cases' },
] as const

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathEnvironment: {
      insertMathEnvironment: (attrs?: { environment?: string; latex?: string }) => ReturnType
    }
  }
}

export const MathEnvironment = Node.create({
  name: 'mathEnvironment',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      environment: { default: 'equation' },
      latex: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-environment"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-environment' })]
  },

  addCommands() {
    return {
      insertMathEnvironment:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { environment: 'equation', latex: '', ...attrs },
          })
        },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div')
      dom.classList.add('math-env-block')

      // Header with label + environment selector
      const header = document.createElement('div')
      header.classList.add('math-env-header')

      const labelSpan = document.createElement('span')
      labelSpan.classList.add('math-env-label')
      labelSpan.textContent = 'Ambiente'
      header.appendChild(labelSpan)

      const select = document.createElement('select')
      select.classList.add('math-env-select')
      for (const opt of MATH_ENV_OPTIONS) {
        const option = document.createElement('option')
        option.value = opt.value
        option.textContent = opt.label
        if (opt.value === node.attrs.environment) option.selected = true
        select.appendChild(option)
      }
      header.appendChild(select)
      dom.appendChild(header)

      // KaTeX preview
      const preview = document.createElement('div')
      preview.classList.add('math-env-preview')
      dom.appendChild(preview)

      // Textarea
      const textarea = document.createElement('textarea')
      textarea.classList.add('math-env-textarea')
      textarea.value = node.attrs.latex as string
      textarea.placeholder = 'Digite sua equação...'
      dom.appendChild(textarea)

      function updateAttrs(attrs: Record<string, unknown>) {
        const pos = getPos()
        if (pos != null) {
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              ...attrs,
            }),
          )
        }
      }

      function renderPreview(latex: string) {
        if (!latex.trim()) {
          preview.innerHTML = '<span class="math-env-placeholder">Preview</span>'
          return
        }
        // Strip alignment markers for KaTeX (it doesn't support align env natively)
        const cleaned = latex.replace(/&/g, ' ').replace(/\\\\/g, ' \\\\ ')
        try {
          preview.innerHTML = katex.renderToString(cleaned, {
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

      renderPreview(node.attrs.latex as string)
      requestAnimationFrame(() => autoResize())

      textarea.addEventListener('mousedown', (e) => e.stopPropagation())

      textarea.addEventListener('input', () => {
        const value = textarea.value
        renderPreview(value)
        autoResize()
        updateAttrs({ latex: value })
      })

      select.addEventListener('mousedown', (e) => e.stopPropagation())
      select.addEventListener('change', () => {
        updateAttrs({ environment: select.value })
      })

      return {
        dom,

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'mathEnvironment') return false
          const newLatex = updatedNode.attrs.latex as string
          const newEnv = updatedNode.attrs.environment as string
          if (textarea.value !== newLatex) {
            textarea.value = newLatex
            renderPreview(newLatex)
            autoResize()
          }
          if (select.value !== newEnv) {
            select.value = newEnv
          }
          // Keep attrs ref up to date for updateAttrs closure
          node = updatedNode
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

        destroy() {},
      }
    }
  },
})
