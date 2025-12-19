'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback component */
  fallback?: React.ReactNode
  /** Custom fallback render function */
  fallbackRender?: (props: FallbackProps) => React.ReactNode
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Called when user clicks retry */
  onReset?: () => void
  /** Error boundary name for logging */
  name?: string
  /** Whether to show detailed error info (dev only) */
  showDetails?: boolean
}

interface FallbackProps {
  error: Error
  errorInfo: React.ErrorInfo | null
  resetError: () => void
}

// =============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// =============================================================================

/**
 * ErrorBoundary - Catches and handles React component errors
 *
 * Features:
 * - Graceful error catching
 * - Customizable fallback UI
 * - Reset/retry functionality
 * - Error logging callbacks
 * - Development error details
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   name="DecisionInterface"
 *   onError={(error) => logError(error)}
 *   onReset={() => refetchData()}
 * >
 *   <DecisionInterface />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`, error, errorInfo)
    }
  }

  resetError = () => {
    this.props.onReset?.()
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback component
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Custom fallback render function
      if (this.props.fallbackRender && this.state.error) {
        return this.props.fallbackRender({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.resetError,
        })
      }

      // Default fallback (error should exist if hasError is true)
      if (!this.state.error) {
        return null
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          name={this.props.name}
          showDetails={this.props.showDetails}
        />
      )
    }

    return this.props.children
  }
}

// =============================================================================
// DEFAULT ERROR FALLBACK UI
// =============================================================================

interface DefaultErrorFallbackProps extends FallbackProps {
  name?: string
  showDetails?: boolean
}

function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  name,
  showDetails = process.env.NODE_ENV === 'development',
}: DefaultErrorFallbackProps) {
  const [showStack, setShowStack] = React.useState(false)

  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="max-w-md w-full bg-card border border-destructive/20 rounded-lg p-6 shadow-lg">
        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h2>
            {name && (
              <p className="text-xs text-muted-foreground">
                Component: {name}
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        <p className="text-sm text-muted-foreground mb-4">
          {error?.message || 'An unexpected error occurred'}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={resetError} size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>

        {/* Developer Details */}
        {showDetails && (
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowStack(!showStack)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bug className="h-3 w-3" />
              {showStack ? 'Hide' : 'Show'} technical details
            </button>

            {showStack && (
              <div className="mt-3 space-y-2">
                <div className="p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                  <div className="text-destructive font-semibold mb-1">
                    {error?.name}: {error?.message}
                  </div>
                  {error?.stack && (
                    <pre className="text-muted-foreground whitespace-pre-wrap text-[10px]">
                      {error.stack}
                    </pre>
                  )}
                </div>

                {errorInfo?.componentStack && (
                  <div className="p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                    <div className="text-amber-500 font-semibold mb-1">
                      Component Stack:
                    </div>
                    <pre className="text-muted-foreground whitespace-pre-wrap text-[10px]">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// INLINE ERROR FALLBACK (for smaller components)
// =============================================================================

interface InlineErrorFallbackProps {
  message?: string
  onRetry?: () => void
  className?: string
}

/**
 * Compact inline error display for smaller components
 */
export function InlineErrorFallback({
  message = 'Failed to load',
  onRetry,
  className,
}: InlineErrorFallbackProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm',
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
      <span className="text-muted-foreground">{message}</span>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm" className="h-6 px-2">
          Retry
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// WITH ERROR BOUNDARY HOC
// =============================================================================

/**
 * Higher-order component to wrap a component with an error boundary
 *
 * @example
 * ```tsx
 * const SafeDecisionInterface = withErrorBoundary(DecisionInterface, {
 *   name: 'DecisionInterface',
 *   fallback: <div>Decision interface unavailable</div>
 * })
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent
}

// =============================================================================
// USE ERROR HANDLER HOOK
// =============================================================================

/**
 * Hook for handling errors in async operations
 *
 * @example
 * ```tsx
 * const { error, handleError, clearError } = useErrorHandler()
 *
 * const fetchData = async () => {
 *   try {
 *     await api.getData()
 *   } catch (e) {
 *     handleError(e)
 *   }
 * }
 * ```
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((e: unknown) => {
    const error = e instanceof Error ? e : new Error(String(e))
    setError(error)

    if (process.env.NODE_ENV === 'development') {
      console.error('[useErrorHandler]', error)
    }
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return { error, handleError, clearError }
}

export default ErrorBoundary
