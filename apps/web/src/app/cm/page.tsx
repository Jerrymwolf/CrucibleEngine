import { requireCMLicense } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Clock, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

export default async function CMDashboardPage() {
  // Server-side license check
  const authResult = await requireCMLicense();

  if (!authResult.authorized) {
    // Show license error page instead of redirecting
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="panel max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">{authResult.reason}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <Link href="/">Return Home</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fetch user's sessions
  const sessions = await prisma.session.findMany({
    where: { crucibleMasterId: authResult.userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      teams: { select: { id: true, name: true } },
    },
  });

  const license = authResult.license!;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="icon" size="sm" />
            <span className="font-semibold">Crucible Master Dashboard</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {authResult.user?.email}
            </span>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
              {license.licenseType}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {/* License Status */}
        <div className="panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">License Status</h2>
              <p className="text-sm text-muted-foreground">
                {license.simulationsRemaining !== null
                  ? `${license.simulationsRemaining} simulations remaining`
                  : 'Unlimited simulations'}
              </p>
            </div>
            {license.expiresAt && (
              <div className="text-right text-sm">
                <span className="text-muted-foreground">Expires:</span>
                <span className="ml-2">
                  {new Date(license.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Create New Session */}
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/cm/new">
            <Plus className="h-4 w-4 mr-2" />
            Create New Session
          </Link>
        </Button>

        {/* Recent Sessions */}
        <div className="panel">
          <h2 className="font-semibold mb-4">Recent Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions yet. Create your first one!</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session: typeof sessions[number]) => (
                <Link
                  key={session.id}
                  href={`/cm/${session.code}`}
                  className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-primary">{session.code}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {session.teams.length} teams
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
