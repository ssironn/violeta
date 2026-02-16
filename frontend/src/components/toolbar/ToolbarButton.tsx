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
        'p-1 rounded transition-all duration-150 flex items-center justify-center',
        'hover:bg-surface-hover',
        active
          ? 'bg-accent-600/20 text-accent-500 shadow-sm shadow-accent-600/10'
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
