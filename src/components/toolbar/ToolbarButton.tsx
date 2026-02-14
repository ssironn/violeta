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
        'p-1.5 rounded-md transition-colors duration-150 flex items-center justify-center',
        'hover:bg-surface-hover',
        active
          ? 'bg-violet-800 text-violet-200'
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
