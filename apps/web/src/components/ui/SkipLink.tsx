'use client'

import { useCallback } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface SkipLinkProps {
  /** ID of the main content element to skip to */
  targetId?: string
  /** Custom label for the skip link */
  label?: string
  /** Additional class names */
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Skip link for keyboard users to bypass navigation
 *
 * This component should be placed at the very beginning of the page layout,
 * before any navigation elements. It becomes visible when focused via Tab key.
 *
 * @example
 * ```tsx
 * // In your layout.tsx or main layout component:
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SkipLink targetId="main-content" />
 *         <nav>...</nav>
 *         <main id="main-content">
 *           {children}
 *         </main>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content',
  className = '',
}: SkipLinkProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()

      const target = document.getElementById(targetId)
      if (target) {
        // Make the target focusable if it isn't already
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1')
        }

        // Focus and scroll to the target
        target.focus({ preventScroll: false })
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [targetId]
  )

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`skip-link ${className}`}
    >
      {label}
    </a>
  )
}

// =============================================================================
// MULTIPLE SKIP LINKS
// =============================================================================

export interface SkipLinkItem {
  /** ID of the target element */
  targetId: string
  /** Label for the skip link */
  label: string
}

export interface SkipLinksProps {
  /** Array of skip link configurations */
  links: SkipLinkItem[]
  /** Additional class names for the container */
  className?: string
}

/**
 * Multiple skip links for complex pages with multiple sections
 *
 * @example
 * ```tsx
 * <SkipLinks
 *   links={[
 *     { targetId: 'main-content', label: 'Skip to main content' },
 *     { targetId: 'map-panel', label: 'Skip to map' },
 *     { targetId: 'decision-panel', label: 'Skip to decisions' },
 *   ]}
 * />
 * ```
 */
export function SkipLinks({ links, className = '' }: SkipLinksProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      event.preventDefault()

      const target = document.getElementById(targetId)
      if (target) {
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1')
        }
        target.focus({ preventScroll: false })
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    []
  )

  return (
    <div className={`skip-links-container ${className}`}>
      {links.map((link, index) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          onClick={(e) => handleClick(e, link.targetId)}
          className="skip-link"
          style={{
            // Stack multiple skip links when focused
            top: `-100%`,
            ['--skip-link-index' as string]: index,
          }}
          onFocus={(e) => {
            e.currentTarget.style.top = `${index * 48}px`
          }}
          onBlur={(e) => {
            e.currentTarget.style.top = '-100%'
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export default SkipLink
