import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageBlock: {
      updateImageBlock: (opts: { pos: number; attrs: Record<string, unknown> }) => ReturnType
      deleteImageBlock: (opts: { pos: number }) => ReturnType
    }
  }
}

/** Parse a width option string like "width=0.8\textwidth" into a percentage (0–100). */
function parseWidthPercent(options: string): number | null {
  const m = options.match(/width\s*=\s*([\d.]+)\\textwidth/)
  if (m) return Math.round(parseFloat(m[1]) * 100)
  return null
}

export const ImageBlock = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetFilename: { default: null },
      options: { default: 'width=0.8\\textwidth' },
      position: { default: 'h' },
      alignment: { default: 'center' },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),

      updateImageBlock:
        ({ pos, attrs }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const node = tr.doc.nodeAt(pos)
            if (!node || node.type.name !== 'image') return false
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
          }
          return true
        },

      deleteImageBlock:
        ({ pos }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const node = tr.doc.nodeAt(pos)
            if (!node || node.type.name !== 'image') return false
            tr.delete(pos, pos + node.nodeSize)
          }
          return true
        },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addNodeView() {
    return ({ node, getPos }) => {
      const dom = document.createElement('div')
      dom.classList.add('block-card-wrapper')
      dom.style.display = 'flex'
      const alignMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' }
      dom.style.justifyContent = alignMap[node.attrs.alignment as string] || 'center'

      const card = document.createElement('div')
      card.classList.add(
        'image-block',
        'relative',
        'border',
        'border-gray-300',
        'rounded-lg',
        'p-3',
        'cursor-pointer',
        'hover:border-purple-400',
        'transition-colors',
      )
      card.style.transition = 'width 0.2s ease'
      dom.appendChild(card)

      const label = document.createElement('div')
      label.classList.add('block-card-label', 'text-xs', 'font-semibold', 'text-purple-600', 'mb-2')
      label.textContent = 'Imagem'
      card.appendChild(label)

      const previewContainer = document.createElement('div')
      previewContainer.style.display = 'flex'
      previewContainer.style.justifyContent = 'center'
      card.appendChild(previewContainer)

      const sizeIndicator = document.createElement('div')
      sizeIndicator.classList.add('text-[10px]', 'text-gray-400', 'text-center', 'mt-1')
      card.appendChild(sizeIndicator)

      const hoverHint = document.createElement('div')
      hoverHint.classList.add(
        'absolute',
        'inset-0',
        'flex',
        'items-center',
        'justify-center',
        'bg-white/80',
        'text-purple-600',
        'font-medium',
        'opacity-0',
        'hover:opacity-100',
        'transition-opacity',
        'rounded-lg',
      )
      hoverHint.textContent = 'Clique para editar'
      card.appendChild(hoverHint)

      function renderPreview(n: ProseMirrorNode) {
        previewContainer.innerHTML = ''
        const src = n.attrs.src as string
        if (!src) {
          previewContainer.textContent = '(sem imagem)'
          previewContainer.style.color = '#9ca3af'
          previewContainer.style.fontSize = '0.875rem'
          previewContainer.style.padding = '1rem 0'
          return
        }
        const img = document.createElement('img')
        img.src = src
        img.alt = (n.attrs.alt as string) || ''
        img.style.maxHeight = '300px'
        img.style.objectFit = 'contain'
        img.style.borderRadius = '4px'
        img.style.width = '100%'

        const pct = parseWidthPercent((n.attrs.options as string) || '')
        if (pct !== null) {
          card.style.width = `${pct}%`
        } else {
          card.style.width = '100%'
        }
        dom.style.justifyContent = alignMap[n.attrs.alignment as string] || 'center'
        previewContainer.appendChild(img)

        sizeIndicator.textContent = pct !== null ? `${pct}% da largura` : ''
      }

      renderPreview(node)

      card.addEventListener('click', () => {
        const pos = getPos()
        if (pos == null) return
        window.dispatchEvent(
          new CustomEvent('image-block-click', {
            detail: {
              src: node.attrs.src,
              alt: node.attrs.alt,
              assetFilename: node.attrs.assetFilename,
              options: node.attrs.options,
              position: node.attrs.position,
              alignment: node.attrs.alignment,
              pos,
            },
          }),
        )
      })

      return {
        dom,

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'image') return false
          node = updatedNode
          renderPreview(updatedNode)
          return true
        },

        selectNode() {
          card.classList.add('ring-2', 'ring-purple-400')
        },

        deselectNode() {
          card.classList.remove('ring-2', 'ring-purple-400')
        },

        stopEvent() {
          return false
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
}).configure({
  inline: false,
  allowBase64: true,
})
