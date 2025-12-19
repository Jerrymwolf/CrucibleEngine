import { redirect } from 'next/navigation';
import { requireCMLicense } from '@/lib/auth';
import { NewSessionClient } from './NewSessionClient';

export default async function NewSessionPage() {
  // Server-side license check
  const authResult = await requireCMLicense();

  if (!authResult.authorized) {
    redirect('/cm'); // Will show license error
  }

  // Check if simulation limit reached
  if (authResult.license?.simulationsRemaining === 0) {
    redirect('/cm?error=limit-reached');
  }

  return (
    <NewSessionClient
      userId={authResult.userId!}
      licenseId={authResult.license!.id}
    />
  );
}
