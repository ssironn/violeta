import { clsx } from 'clsx'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  tooltip: string
  active?: boolean
}

export function ToolbarButton({
  icon,
  tooltip,
  active = false,
  className,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      title={tooltip}
      className={clsx(
        'p-1.5 rounded-md transition-all duration-150 flex items-center justify-center',
        'hover:bg-surface-hover',
        active
          ? 'bg-violet-600/20 text-violet-300 shadow-sm shadow-violet-600/10'
          : 'text-text-secondary hover:text-text-primary',
        props.disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
