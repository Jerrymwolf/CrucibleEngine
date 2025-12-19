import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useButtonSound } from '@/hooks/useSound'

const buttonVariants = cva(
  // Base styles with juice: scale transforms, smooth transitions
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'ring-offset-background transition-all duration-150 ease-out ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ' +
    // Juice: hover scale up, active scale down
    'hover:scale-[1.02] active:scale-[0.98] ' +
    // Respect reduced motion preference
    'motion-reduce:transform-none motion-reduce:transition-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground ' +
          'hover:bg-primary/90 hover:shadow-[0_0_20px_hsla(199,89%,48%,0.4)]',
        destructive:
          'bg-destructive text-destructive-foreground ' +
          'hover:bg-destructive/90 hover:shadow-[0_0_20px_hsla(0,84%,60%,0.4)]',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // New: Critical action button with pulse effect
        critical:
          'bg-red-600 text-white font-bold ' +
          'hover:bg-red-700 hover:shadow-[0_0_30px_hsla(0,100%,50%,0.6)] ' +
          'animate-pulse-subtle',
        // New: Success action button
        success:
          'bg-green-600 text-white ' +
          'hover:bg-green-700 hover:shadow-[0_0_20px_hsla(142,76%,36%,0.4)]',
        // New: Warning action button
        warning:
          'bg-amber-500 text-black font-medium ' +
          'hover:bg-amber-600 hover:shadow-[0_0_20px_hsla(38,92%,50%,0.4)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-md px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Show loading spinner and disable interactions */
  loading?: boolean
  /** Sound to play on click. Set to 'none' to disable */
  sound?: 'click' | 'confirm' | 'cancel' | 'critical' | 'none'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      sound = 'click',
      onClick,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const { onClick: playClick, onHover } = useButtonSound()
    const Comp = asChild ? Slot : 'button'

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (sound !== 'none') {
          playClick()
        }
        onClick?.(e)
      },
      [onClick, playClick, sound]
    )

    const handleMouseEnter = React.useCallback(() => {
      // Play hover sound for interactive feedback
      onHover()
    }, [onHover])

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <span
              className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
