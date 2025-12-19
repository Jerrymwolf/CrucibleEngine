import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100">The Values Crucible</h1>
          <p className="text-slate-400 mt-2">Sign in to access Crucible Master features</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-slate-900 border border-slate-800',
            },
          }}
        />
      </div>
    </div>
  );
}
