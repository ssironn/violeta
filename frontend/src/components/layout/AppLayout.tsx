import { type ReactNode } from 'react'

interface AppLayoutProps {
  toolbar: ReactNode
  editor: ReactNode
  rightPanel: ReactNode
}

export function AppLayout({
  toolbar,
  editor,
  rightPanel,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {toolbar}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor — 50% */}
        <div className="flex-1 flex overflow-hidden basis-1/2 min-w-0">
          {editor}
        </div>
        {/* Divider */}
        <div className="w-px bg-surface-border flex-shrink-0" />
        {/* Preview — 50% */}
        <div className="flex-1 flex overflow-hidden basis-1/2 min-w-0">
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
