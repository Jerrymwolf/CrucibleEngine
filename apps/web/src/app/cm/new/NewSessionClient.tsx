'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as Colyseus from 'colyseus.js';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

const COLYSEUS_URL = process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567';

interface NewSessionClientProps {
  userId: string;
  licenseId: string;
}

function NewSessionContent({ userId, licenseId }: NewSessionClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cmName = searchParams.get('name') || 'Crucible Master';
  const companyName = searchParams.get('company') || '';
  const hasCreated = useRef(false);

  useEffect(() => {
    if (hasCreated.current) return;
    hasCreated.current = true;

    async function createSession() {
      try {
        const client = new Colyseus.Client(COLYSEUS_URL);

        const room = await client.create('crucible', {
          role: 'cm',
          participantName: cmName,
          companyName,
          create: true,
          cmUserId: userId, // Pass for ownership
        });

        const sessionCode = room.roomId;
        await room.leave();

        // Increment simulation count on server
        await fetch('/api/cm/sessions/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseId }),
        });

        router.replace(`/cm/${sessionCode}?name=${encodeURIComponent(cmName)}`);
      } catch (error) {
        console.error('Failed to create session:', error);
        router.replace('/cm?error=create-failed');
      }
    }

    createSession();
  }, [cmName, companyName, router, userId, licenseId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
        <Logo variant="icon" size="lg" linkToHome={false} />
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-muted-foreground">Creating new session...</span>
        </div>
      </div>
    </div>
  );
}

export function NewSessionClient(props: NewSessionClientProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    }>
      <NewSessionContent {...props} />
    </Suspense>
  );
}
