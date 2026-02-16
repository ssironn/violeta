import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export const CALLOUT_TYPES = [
  { value: 'theorem', label: 'Teorema', color: '#3b82f6' },
  { value: 'definition', label: 'Definição', color: '#10b981' },
  { value: 'lemma', label: 'Lema', color: '#6366f1' },
  { value: 'proof', label: 'Demonstração', color: '#6b7280' },
  { value: 'corollary', label: 'Corolário', color: '#8b5cf6' },
  { value: 'remark', label: 'Observação', color: '#f59e0b' },
  { value: 'example', label: 'Exemplo', color: '#ec4899' },
  { value: 'exercise', label: 'Exercício', color: '#0ea5e9' },
  { value: 'proposition', label: 'Proposição', color: '#14b8a6' },
  { value: 'conjecture', label: 'Conjectura', color: '#f97316' },
  { value: 'note', label: 'Nota', color: '#64748b' },
  { value: 'questao', label: 'Questão', color: '#6b7280' },
] as const

export type CalloutType = (typeof CALLOUT_TYPES)[number]['value']

function getCalloutInfo(type: string) {
  return CALLOUT_TYPES.find((t) => t.value === type) ?? CALLOUT_TYPES[0]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    calloutBlock: {
      insertCallout: (attrs?: { calloutType?: string; title?: string }) => ReturnType
    }
  }
}

export const CalloutBlock = Node.create({
  name: 'calloutBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      calloutType: { default: 'theorem' },
      title: { default: '' },
      textAlign: {
        default: 'left',
        renderHTML: (attributes: Record<string, unknown>) => {
          return { style: `text-align: ${attributes.textAlign}` }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0]
  },

  addCommands() {
    return {
      insertCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { calloutType: 'theorem', title: '', ...attrs },
            content: [{ type: 'paragraph' }],
          })
        },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div')
      dom.classList.add('block-card-wrapper')

      const card = document.createElement('div')
      card.classList.add('callout-block')
      dom.appendChild(card)

      // Header bar
      const headerBar = document.createElement('div')
      headerBar.classList.add('callout-header')
      card.appendChild(headerBar)

      // Type selector
      const select = document.createElement('select')
      select.classList.add('callout-type-select')
      for (const t of CALLOUT_TYPES) {
        const option = document.createElement('option')
        option.value = t.value
        option.textContent = t.label
        select.appendChild(option)
      }
      headerBar.appendChild(select)

      // Title input
      const titleInput = document.createElement('input')
      titleInput.classList.add('callout-title-input')
      titleInput.type = 'text'
      titleInput.placeholder = 'Título (opcional)'
      headerBar.appendChild(titleInput)

      // Content area (managed by ProseMirror)
      const contentDOM = document.createElement('div')
      contentDOM.classList.add('callout-content')
      card.appendChild(contentDOM)

      function applyStyle(type: string) {
        const info = getCalloutInfo(type)
        card.style.borderLeftColor = info.color
        headerBar.style.borderBottomColor = info.color + '30'
        select.style.color = info.color
      }

      function applyAlignment(n: ProseMirrorNode) {
        const align = (n.attrs.textAlign as string) || 'left'
        dom.style.textAlign = align
      }

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

      // Initial state
      select.value = node.attrs.calloutType as string
      titleInput.value = node.attrs.title as string
      applyStyle(node.attrs.calloutType as string)
      applyAlignment(node)

      // Events
      select.addEventListener('mousedown', (e) => e.stopPropagation())
      select.addEventListener('change', () => {
        applyStyle(select.value)
        updateAttrs({ calloutType: select.value })
      })

      titleInput.addEventListener('mousedown', (e) => e.stopPropagation())
      titleInput.addEventListener('keydown', (e) => e.stopPropagation())
      titleInput.addEventListener('input', () => {
        updateAttrs({ title: titleInput.value })
      })

      return {
        dom,
        contentDOM,

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'calloutBlock') return false
          applyAlignment(updatedNode)
          const newType = updatedNode.attrs.calloutType as string
          const newTitle = updatedNode.attrs.title as string
          if (select.value !== newType) {
            select.value = newType
            applyStyle(newType)
          }
          if (titleInput.value !== newTitle) {
            titleInput.value = newTitle
          }
          node = updatedNode
          return true
        },

        selectNode() {
          card.classList.add('selected')
        },

        deselectNode() {
          card.classList.remove('selected')
        },

        // Only stop events from header controls, let content area events pass through
        stopEvent(event: Event) {
          const target = event.target as HTMLElement
          return headerBar.contains(target)
        },

        ignoreMutation(mutation: MutationRecord | { type: 'selection' }) {
          // Ignore mutations in the header (select/input changes)
          if (mutation.type === 'selection') return false
          if ('target' in mutation && headerBar.contains(mutation.target as HTMLElement)) return true
          return false
        },

        destroy() {},
      }
    }
  },
})
