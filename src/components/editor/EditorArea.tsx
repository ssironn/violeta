import { useEffect, useRef, useState } from 'react'
import { EditorContent, type Editor } from '@tiptap/react'
import { BlockInsertMenu } from './BlockInsertMenu'
import { BlockHandle } from './BlockHandle'
import { SlashCommandMenu } from '../../extensions/SlashCommands'

/** A4 at 96 DPI */
const A4_WIDTH = 794
const A4_HEIGHT = 1123

interface EditorAreaProps {
  editor: Editor
  onOpenMathEditor: (latex: string) => void
  onOpenImageModal: () => void
  onHoverMath: (latex: string | null) => void
}

export function EditorArea({ editor, onOpenMathEditor, onOpenImageModal, onHoverMath }: EditorAreaProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [pageBreaks, setPageBreaks] = useState<number[]>([])

  // Page break tracking
  useEffect(() => {
    const tiptap = wrapperRef.current?.querySelector('.tiptap') as HTMLElement | null
    if (!tiptap) return

    const update = () => {
      const h = tiptap.scrollHeight
      const breaks: number[] = []
      let y = A4_HEIGHT
      while (y < h) {
        breaks.push(y)
        y += A4_HEIGHT
      }
      setPageBreaks(breaks)
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(tiptap)

    const onEditorUpdate = () => requestAnimationFrame(update)
    editor.on('update', onEditorUpdate)

    return () => {
      ro.disconnect()
      editor.off('update', onEditorUpdate)
    }
  }, [editor])

  // Hover detection on math nodes
  useEffect(() => {
    const editorDom = editor.view.dom

    function handleMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement
      const mathEl = target.closest('.tiptap-mathematics-render')
      if (mathEl) {
        try {
          const pos = editor.view.posAtDOM(mathEl, 0)
          const node = editor.state.doc.nodeAt(pos)
          if (node && (node.type.name === 'inlineMath' || node.type.name === 'blockMath')) {
            onHoverMath(node.attrs.latex)
            return
          }
        } catch {
          // posAtDOM can throw if DOM is out of sync
        }
      }
    }

    function handleMouseOut(e: MouseEvent) {
      const related = e.relatedTarget as HTMLElement | null
      if (!related?.closest('.tiptap-mathematics-render')) {
        onHoverMath(null)
      }
    }

    editorDom.addEventListener('mouseover', handleMouseOver)
    editorDom.addEventListener('mouseout', handleMouseOut)

    return () => {
      editorDom.removeEventListener('mouseover', handleMouseOver)
      editorDom.removeEventListener('mouseout', handleMouseOut)
    }
  }, [editor, onHoverMath])

  return (
    <div className="flex-1 overflow-auto bg-surface-bg py-8 flex justify-center">
      <div
        ref={wrapperRef}
        className="relative"
        style={{ width: A4_WIDTH }}
      >
        {/* White paper */}
        <div
          className="bg-white rounded-sm relative"
          style={{
            minHeight: A4_HEIGHT,
            boxShadow:
              '0 2px 40px rgba(88, 28, 135, 0.12), 0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <EditorContent editor={editor} />

          {/* Block drag handle with options popover */}
          <BlockHandle editor={editor} />

          {/* Slash command floating menu */}
          <SlashCommandMenu editor={editor} onOpenMathEditor={onOpenMathEditor} onOpenImageModal={onOpenImageModal} />

          {/* Notion-like + button */}
          <BlockInsertMenu editor={editor} onOpenMathEditor={onOpenMathEditor} onOpenImageModal={onOpenImageModal} />
        </div>

        {/* Page break indicators */}
        {pageBreaks.map((y, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 pointer-events-none z-20"
            style={{ top: y }}
          >
            <div className="relative flex items-center h-10 -translate-y-1/2">
              {/* Left line */}
              <div className="flex-1 border-t border-dashed border-violet-300/40" />
              {/* Page label */}
              <span className="mx-3 px-3 py-0.5 text-[10px] text-violet-400/50 bg-white rounded-full font-medium tracking-wide whitespace-nowrap shadow-sm border border-violet-200/30">
                Página {i + 2}
              </span>
              {/* Right line */}
              <div className="flex-1 border-t border-dashed border-violet-300/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
