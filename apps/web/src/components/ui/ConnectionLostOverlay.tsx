'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionLostOverlayProps {
  onReconnect: () => void;
  onGoHome: () => void;
  reconnecting?: boolean;
}

export function ConnectionLostOverlay({
  onReconnect,
  onGoHome,
  reconnecting = false,
}: ConnectionLostOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="panel max-w-md text-center space-y-4">
        <WifiOff className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Connection Lost</h2>
        <p className="text-muted-foreground">
          We couldn&apos;t reconnect to the session server after multiple attempts.
        </p>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={onReconnect}
            disabled={reconnecting}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${reconnecting ? 'animate-spin' : ''}`} />
            {reconnecting ? 'Reconnecting...' : 'Try Again'}
          </Button>
          <Button onClick={onGoHome}>
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
