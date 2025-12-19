import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100">The Values Crucible</h1>
          <p className="text-slate-400 mt-2">Create an account to become a Crucible Master</p>
        </div>
        <SignUp
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
