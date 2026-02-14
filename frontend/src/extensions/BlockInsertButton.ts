import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

const PLUGIN_KEY = new PluginKey('blockInsertButton')

/**
 * BlockInsertButton — shows a thin "+" bar between block nodes on hover.
 * Adjacent blocks spread apart with a smooth animation.
 * Clicking the "+" inserts an empty paragraph at that position.
 */
export const BlockInsertButton = Extension.create({
  name: 'blockInsertButton',

  addProseMirrorPlugins() {
    let widget: HTMLDivElement | null = null
    let insertPos: number | null = null
    let activeGapIndex: number | null = null
    let fadeOutTimer: ReturnType<typeof setTimeout> | null = null
    let spreadAboveEl: HTMLElement | null = null
    let spreadBelowEl: HTMLElement | null = null
    let hoveringWidget = false

    function getBlockChildren(editorDom: HTMLElement): HTMLElement[] {
      return (Array.from(editorDom.children) as HTMLElement[])
        .filter((el) => !el.classList.contains('block-insert-bar'))
    }

    function pauseObserver(view: EditorView) {
      const obs = (view as any).domObserver
      if (obs?.stop) obs.stop()
    }

    function resumeObserver(view: EditorView) {
      const obs = (view as any).domObserver
      if (obs?.start) obs.start()
    }

    function clearSpread(view?: EditorView) {
      if (!spreadAboveEl && !spreadBelowEl) return
      if (view) pauseObserver(view)

      if (spreadAboveEl) {
        spreadAboveEl.style.transform = ''
        spreadAboveEl.style.transition = ''
        spreadAboveEl = null
      }
      if (spreadBelowEl) {
        spreadBelowEl.style.transform = ''
        spreadBelowEl.style.transition = ''
        spreadBelowEl = null
      }

      if (view) resumeObserver(view)
    }

    function applySpread(view: EditorView, gapIndex: number) {
      const children = getBlockChildren(view.dom)
      pauseObserver(view)

      if (gapIndex < children.length) {
        spreadAboveEl = children[gapIndex]
        spreadAboveEl.style.transition = 'transform 0.2s ease-out'
        void spreadAboveEl.offsetHeight
        spreadAboveEl.style.transform = 'translateY(-6px)'
      }
      if (gapIndex + 1 < children.length) {
        spreadBelowEl = children[gapIndex + 1]
        spreadBelowEl.style.transition = 'transform 0.2s ease-out'
        void spreadBelowEl.offsetHeight
        spreadBelowEl.style.transform = 'translateY(6px)'
      }

      resumeObserver(view)
    }

    function removeWidget(view: EditorView, instant = false) {
      if (fadeOutTimer) {
        clearTimeout(fadeOutTimer)
        fadeOutTimer = null
      }
      clearSpread(view)
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

      const line = document.createElement('div')
      line.className = 'block-insert-line'

      const btn = document.createElement('button')
      btn.className = 'block-insert-btn'
      btn.type = 'button'
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
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

      // Track hover on the widget itself to prevent premature removal
      el.addEventListener('mouseenter', () => {
        hoveringWidget = true
      })
      el.addEventListener('mouseleave', () => {
        hoveringWidget = false
        // Check if mouse is back over the editor gap area; if not, remove
        setTimeout(() => {
          if (!hoveringWidget && widget === el) {
            removeWidget(view)
          }
        }, 200)
      })

      el.appendChild(line)
      el.appendChild(btn)
      el.appendChild(line.cloneNode(true))

      // Position absolutely relative to the editor wrapper
      const editorRect = view.dom.getBoundingClientRect()
      el.style.top = `${top - editorRect.top + view.dom.offsetTop}px`

      view.dom.parentElement?.appendChild(el)
      widget = el

      // Apply spread animation via inline styles
      applySpread(view, gapIndex)
    }

    return [
      new Plugin({
        key: PLUGIN_KEY,

        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              const mouseY = event.clientY
              const editorRect = view.dom.getBoundingClientRect()

              // Ignore if mouse is outside editor horizontal bounds
              if (event.clientX < editorRect.left || event.clientX > editorRect.right) {
                if (!hoveringWidget) removeWidget(view)
                return false
              }

              const doc = view.state.doc
              const gaps: Array<{ y: number; pos: number; index: number }> = []

              const domChildren = getBlockChildren(view.dom)

              // Map each top-level doc node to its endPos
              const endPositions: number[] = []
              doc.forEach((node, offset) => {
                endPositions.push(offset + node.nodeSize)
              })

              // Build gaps at the midpoint between consecutive DOM children
              for (let i = 0; i < domChildren.length - 1; i++) {
                const currRect = domChildren[i].getBoundingClientRect()
                const nextRect = domChildren[i + 1].getBoundingClientRect()
                const midY = (currRect.bottom + nextRect.top) / 2
                if (i < endPositions.length) {
                  gaps.push({ y: midY, pos: endPositions[i], index: i })
                }
              }

              // Find the closest gap to the mouse
              let closest: { y: number; pos: number; index: number } | null = null
              let closestDist = Infinity

              for (const gap of gaps) {
                const dist = Math.abs(mouseY - gap.y)
                if (dist < closestDist) {
                  closestDist = dist
                  closest = gap
                }
              }

              // Only show if mouse is within 20px of a gap
              if (closest && closestDist < 20) {
                // Don't recreate if same gap
                if (activeGapIndex === closest.index && widget) return false
                createWidget(view, closest.y, closest.pos, closest.index)
              } else {
                // Don't remove if the user is hovering the widget
                if (widget && !hoveringWidget) removeWidget(view)
              }

              return false
            },

            mouseleave(view) {
              // Delay removal to allow moving mouse onto the widget
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
          clearSpread()
          if (widget) {
            widget.remove()
            widget = null
          }
        },
      }),
    ]
  },
})
