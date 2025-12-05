'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Users, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [cmName, setCmName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sessionCode || sessionCode.length !== 6) {
      setError('Please enter a valid 6-character session code');
      return;
    }

    if (!participantName) {
      setError('Please enter your name');
      return;
    }

    // Navigate to session
    router.push(`/session/${sessionCode.toUpperCase()}?name=${encodeURIComponent(participantName)}`);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cmName) {
      setError('Please enter your name');
      return;
    }

    // Navigate to CM console (session will be created on the server)
    router.push(`/cm/new?name=${encodeURIComponent(cmName)}&company=${encodeURIComponent(companyName)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Logo
              variant="full"
              size="lg"
              linkToHome={false}
              priority={true}
              className="mx-auto"
            />
          </div>
          <p className="text-muted-foreground animate-in fade-in duration-700 delay-200">
            Practice enacting values under pressure
          </p>
        </div>

        {/* Main Card */}
        <div className="panel">
          <Tabs defaultValue="join" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="join" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Join Session
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Create Session
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join" className="space-y-4 mt-4">
              <form onSubmit={handleJoinSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionCode">Session Code</Label>
                  <Input
                    id="sessionCode"
                    placeholder="ABCD12"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participantName">Your Name</Label>
                  <Input
                    id="participantName"
                    placeholder="Enter your name"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Join Session
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="create" className="space-y-4 mt-4">
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cmName">Your Name (Crucible Master)</Label>
                  <Input
                    id="cmName"
                    placeholder="Enter your name"
                    value={cmName}
                    onChange={(e) => setCmName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name (Optional)</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Create Session
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm mt-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Practice enacting values under pressure
        </p>
      </div>
    </div>
  );
}
