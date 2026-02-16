import { type ReactNode, useState, useCallback, useRef, useEffect } from 'react'

interface AppLayoutProps {
  toolbar: ReactNode
  editor: ReactNode
  rightPanel: ReactNode
  showRightPanel?: boolean
}

export function AppLayout({
  toolbar,
  editor,
  rightPanel,
  showRightPanel = true,
}: AppLayoutProps) {
  const [splitPercent, setSplitPercent] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = (x / rect.width) * 100
      setSplitPercent(Math.min(80, Math.max(20, percent)))
    }

    function onMouseUp() {
      if (dragging.current) {
        dragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {toolbar}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div
          className="flex overflow-hidden min-w-0"
          style={{ width: showRightPanel ? `${splitPercent}%` : '100%' }}
        >
          {editor}
        </div>
        {showRightPanel && (
          <>
            {/* Resize handle */}
            <div
              className="split-handle"
              onMouseDown={onMouseDown}
            >
              <div className="split-handle-line" />
            </div>
            {/* Preview */}
            <div className="flex overflow-hidden min-w-0" style={{ width: `${100 - splitPercent}%` }}>
              {rightPanel}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
