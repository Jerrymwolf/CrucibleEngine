'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  linkToHome?: boolean;
  className?: string;
  priority?: boolean;
}

const sizeConfig = {
  icon: {
    xs: { width: 20, height: 20, className: 'h-5 w-5' },
    sm: { width: 24, height: 24, className: 'h-6 w-6' },
    md: { width: 32, height: 32, className: 'h-8 w-8' },
    lg: { width: 48, height: 48, className: 'h-12 w-12' },
    xl: { width: 64, height: 64, className: 'h-16 w-16' },
  },
  full: {
    xs: { width: 130, height: 80, className: 'h-10 w-auto' },
    sm: { width: 163, height: 100, className: 'h-12 w-auto' },
    md: { width: 195, height: 120, className: 'h-16 w-auto' },
    lg: { width: 260, height: 160, className: 'h-20 w-auto' },
    xl: { width: 325, height: 200, className: 'h-24 w-auto' },
  },
} as const;

export function Logo({
  variant = 'icon',
  size = 'md',
  linkToHome = true,
  className,
  priority = false,
}: LogoProps) {
  const config = sizeConfig[variant][size];
  const src = variant === 'full' ? '/logos/vc-logo-full.jpg' : '/logos/vc-icon.jpg';
  const alt = variant === 'full'
    ? 'ValuesCrucible - AI Crisis Simulation'
    : 'ValuesCrucible';

  const imageElement = (
    <Image
      src={src}
      alt={alt}
      width={config.width}
      height={config.height}
      className={cn(
        config.className,
        'object-contain',
        className
      )}
      priority={priority}
    />
  );

  if (!linkToHome) {
    return imageElement;
  }

  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center',
        'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'transition-opacity hover:opacity-80 active:opacity-70'
      )}
      aria-label="Go to homepage"
    >
      {imageElement}
    </Link>
  );
}

export function LogoIcon(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="icon" />;
}

export function LogoFull(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="full" />;
}
