import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'destructive' | 'secondary'
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          {
            'bg-blue-100 text-blue-800': variant === 'default',
            'bg-green-100 text-green-800': variant === 'success',
            'bg-red-100 text-red-800': variant === 'destructive',
            'bg-gray-100 text-gray-800': variant === 'secondary',
          }
        ),
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
