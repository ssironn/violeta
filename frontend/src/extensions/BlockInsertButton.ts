import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

const PLUGIN_KEY = new PluginKey('blockInsertButton')

/**
 * BlockInsertButton — shows a subtle "+" dot in the left gutter between
 * block nodes. Appears after a short hover delay to avoid visual noise.
 * No spread animation, no horizontal lines — just a quiet affordance.
 */
export const BlockInsertButton = Extension.create({
  name: 'blockInsertButton',

  addProseMirrorPlugins() {
    let widget: HTMLDivElement | null = null
    let insertPos: number | null = null
    let activeGapIndex: number | null = null
    let fadeOutTimer: ReturnType<typeof setTimeout> | null = null
    let showTimer: ReturnType<typeof setTimeout> | null = null
    let hoveringWidget = false
    let pendingGap: { y: number; pos: number; index: number } | null = null

    function getBlockChildren(editorDom: HTMLElement): HTMLElement[] {
      return (Array.from(editorDom.children) as HTMLElement[])
        .filter((el) => !el.classList.contains('block-insert-bar'))
    }

    function removeWidget(view: EditorView, instant = false) {
      if (showTimer) {
        clearTimeout(showTimer)
        showTimer = null
      }
      if (fadeOutTimer) {
        clearTimeout(fadeOutTimer)
        fadeOutTimer = null
      }
      pendingGap = null
      hoveringWidget = false
      if (widget) {
        if (instant) {
          widget.remove()
          widget = null
        } else {
          const el = widget
          el.classList.add('removing')
          widget = null
          fadeOutTimer = setTimeout(() => {
            el.remove()
            fadeOutTimer = null
          }, 150)
        }
      }
      insertPos = null
      activeGapIndex = null
    }

    function createWidget(view: EditorView, top: number, pos: number, gapIndex: number) {
      removeWidget(view, true)

      insertPos = pos
      activeGapIndex = gapIndex

      const el = document.createElement('div')
      el.className = 'block-insert-bar'

      const btn = document.createElement('button')
      btn.className = 'block-insert-btn'
      btn.type = 'button'
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (insertPos === null) return

        const { tr, schema } = view.state
        const paragraphType = schema.nodes.paragraph
        if (!paragraphType) return

        tr.insert(insertPos, paragraphType.create())
        const resolved = tr.doc.resolve(insertPos + 1)
        tr.setSelection(TextSelection.near(resolved))
        view.dispatch(tr)
        view.focus()
        removeWidget(view, true)
      })

      el.addEventListener('mouseenter', () => {
        hoveringWidget = true
      })
      el.addEventListener('mouseleave', () => {
        hoveringWidget = false
        setTimeout(() => {
          if (!hoveringWidget && widget === el) {
            removeWidget(view)
          }
        }, 200)
      })

      el.appendChild(btn)

      const editorRect = view.dom.getBoundingClientRect()
      el.style.top = `${top - editorRect.top + view.dom.offsetTop}px`

      view.dom.parentElement?.appendChild(el)
      widget = el
    }

    const SHOW_DELAY = 400
    const GAP_THRESHOLD = 12

    return [
      new Plugin({
        key: PLUGIN_KEY,

        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              const mouseY = event.clientY
              const editorRect = view.dom.getBoundingClientRect()

              if (event.clientX < editorRect.left || event.clientX > editorRect.right) {
                if (!hoveringWidget) removeWidget(view)
                return false
              }

              const doc = view.state.doc
              const gaps: Array<{ y: number; pos: number; index: number }> = []

              const domChildren = getBlockChildren(view.dom)

              const endPositions: number[] = []
              doc.forEach((node, offset) => {
                endPositions.push(offset + node.nodeSize)
              })

              for (let i = 0; i < domChildren.length - 1; i++) {
                const currRect = domChildren[i].getBoundingClientRect()
                const nextRect = domChildren[i + 1].getBoundingClientRect()
                const midY = (currRect.bottom + nextRect.top) / 2
                if (i < endPositions.length) {
                  gaps.push({ y: midY, pos: endPositions[i], index: i })
                }
              }

              let closest: { y: number; pos: number; index: number } | null = null
              let closestDist = Infinity

              for (const gap of gaps) {
                const dist = Math.abs(mouseY - gap.y)
                if (dist < closestDist) {
                  closestDist = dist
                  closest = gap
                }
              }

              if (closest && closestDist < GAP_THRESHOLD) {
                // Already showing this gap
                if (activeGapIndex === closest.index && widget) return false

                // Already pending for this gap
                if (pendingGap && pendingGap.index === closest.index) return false

                // Cancel any pending show for a different gap
                if (showTimer) {
                  clearTimeout(showTimer)
                  showTimer = null
                }

                pendingGap = closest
                const gap = closest
                showTimer = setTimeout(() => {
                  showTimer = null
                  pendingGap = null
                  createWidget(view, gap.y, gap.pos, gap.index)
                }, SHOW_DELAY)
              } else {
                // Mouse moved away from any gap
                if (showTimer) {
                  clearTimeout(showTimer)
                  showTimer = null
                  pendingGap = null
                }
                if (widget && !hoveringWidget) removeWidget(view)
              }

              return false
            },

            mouseleave(view) {
              setTimeout(() => {
                if (!hoveringWidget && widget) {
                  removeWidget(view)
                }
              }, 200)
              return false
            },
          },
        },

        destroy() {
          if (showTimer) clearTimeout(showTimer)
          if (widget) {
            widget.remove()
            widget = null
          }
        },
      }),
    ]
  },
})
