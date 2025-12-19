'use client';

import { UserButton, useUser, SignInButton } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { Button } from './button';

interface AuthHeaderProps {
  showSignIn?: boolean;
  className?: string;
}

export function AuthHeader({ showSignIn = true, className = '' }: AuthHeaderProps) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    if (!showSignIn) return null;
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <SignInButton mode="modal">
          <Button variant="outline" size="sm">Sign In</Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {user.firstName || user.emailAddresses[0]?.emailAddress}
      </span>
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: 'h-8 w-8',
          },
        }}
      />
    </div>
  );
}
