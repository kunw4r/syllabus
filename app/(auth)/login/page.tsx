'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Eye, EyeOff, Film, Tv, BookOpen } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, username);
        if (error) throw error;
        setMessage('Check your email to confirm your account!');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-dark-900" />
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-accent/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 items-center justify-center p-16">
        <div className="max-w-md">
          <Image
            src="/logo.png"
            alt="Syllabus"
            width={180}
            height={48}
            className="h-12 w-auto mb-8"
            priority
          />
          <h1 className="font-serif text-4xl xl:text-5xl text-white leading-tight mb-6">
            Your personal
            <br />
            <span className="text-accent">entertainment</span>
            <br />
            library.
          </h1>
          <p className="text-white/40 text-lg leading-relaxed mb-10">
            Track, rate, and discover movies, TV shows, and books — all in one beautifully designed space.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Film size={16} className="text-accent/70" />
              <span className="text-sm text-white/50">Movies</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Tv size={16} className="text-cyan-400/70" />
              <span className="text-sm text-white/50">TV Shows</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <BookOpen size={16} className="text-amber-400/70" />
              <span className="text-sm text-white/50">Books</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 relative z-10">
        <div className="w-full max-w-sm">
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm mb-10 transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={2.5} /> Back
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Image
              src="/logo.png"
              alt="Syllabus"
              width={120}
              height={36}
              className="h-8 w-auto mb-2"
              priority
            />
            <p className="text-white/30 text-sm">Track movies, shows & books you love.</p>
          </div>

          {/* Card */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-1">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-white/30 mb-8">
              {isSignUp
                ? 'Start tracking your entertainment journey'
                : 'Sign in to your Syllabus account'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5 ml-1">Username</label>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                    }
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all"
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]{3,20}"
                    title="3-20 characters, letters, numbers, and underscores only"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5 ml-1">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isSignUp ? 'Min 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/20 outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-2.5">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent/90 active:scale-[0.98] text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2 shadow-lg shadow-accent/20"
              >
                {loading
                  ? 'Loading...'
                  : isSignUp
                    ? 'Create account'
                    : 'Sign in'}
              </button>
            </form>
          </div>

          {/* Toggle */}
          <p className="text-sm text-white/30 mt-6 text-center">
            {isSignUp
              ? 'Already have an account?'
              : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setMessage('');
              }}
              className="text-accent hover:text-accent/80 font-medium transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
