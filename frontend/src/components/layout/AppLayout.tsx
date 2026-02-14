import { type ReactNode, useState, useCallback, useRef, useEffect } from 'react'

interface AppLayoutProps {
  toolbar: ReactNode
  sidebar: ReactNode
  editor: ReactNode
  rightPanel: ReactNode
  showCode: boolean
}

const MIN_PANEL_WIDTH = 280
const MAX_PANEL_WIDTH = 700
const DEFAULT_PANEL_WIDTH = 400

export function AppLayout({
  toolbar,
  sidebar,
  editor,
  rightPanel,
  showCode,
}: AppLayoutProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = Math.round(rect.right - e.clientX)
      setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth)))
    }

    function handleMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {toolbar}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {sidebar}
        <div className="flex-1 flex overflow-hidden">
          {editor}
        </div>
        {showCode && (
          <>
            {/* Drag handle */}
            <div
              onMouseDown={handleMouseDown}
              className="w-1 flex-shrink-0 cursor-col-resize group relative hover:bg-violet-500/30 active:bg-violet-500/40 transition-colors"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
            <div style={{ width: panelWidth }} className="flex-shrink-0 overflow-hidden">
              {rightPanel}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
