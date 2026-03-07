'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Eye, EyeOff, Film, Tv, BookOpen, Star, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

const FEATURES = [
  { icon: Film, label: 'Track Movies', description: 'Log and rate every film you watch' },
  { icon: Tv, label: 'Follow Shows', description: 'Track your episode progress' },
  { icon: BookOpen, label: 'Catalog Books', description: 'Build your reading library' },
  { icon: Star, label: 'Rate & Review', description: 'Score everything you consume' },
  { icon: Users, label: 'Social', description: 'See what friends are watching' },
  { icon: BarChart3, label: 'Insights', description: 'Get personalized recommendations' },
];

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
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-dark-900" />
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-accent/[0.03] rounded-full blur-[180px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/[0.02] rounded-full blur-[150px]" />
        <div className="absolute top-[30%] left-[40%] w-[400px] h-[400px] bg-purple-500/[0.015] rounded-full blur-[120px]" />
      </div>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[55%] relative z-10 items-center justify-center p-12 xl:p-20">
        <div className="max-w-lg">
          <Image
            src="/logo.png"
            alt="Syllabus"
            width={180}
            height={48}
            className="h-10 w-auto mb-10"
            priority
          />

          <h1 className="font-serif text-4xl xl:text-5xl 2xl:text-6xl text-white leading-[1.08] mb-5">
            Your personal
            <br />
            <span className="bg-gradient-to-r from-accent via-rose-400 to-amber-400 bg-clip-text text-transparent">entertainment</span>
            <br />
            library.
          </h1>
          <p className="text-white/35 text-base xl:text-lg leading-relaxed mb-12 max-w-md">
            Track, rate, and discover movies, TV shows, and books — all in one beautifully designed space.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-white/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/70">{label}</p>
                  <p className="text-[11px] text-white/25 leading-snug mt-0.5">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 relative z-10">
        <div className="w-full max-w-[380px]">
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-white/25 hover:text-white/60 text-sm mb-8 transition-colors"
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
              className="h-8 w-auto mb-3"
              priority
            />
            <p className="text-white/25 text-sm">Track movies, shows & books you love.</p>
          </div>

          {/* Card */}
          <div className="bg-white/[0.025] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/20">
            <h2 className="text-2xl font-bold text-white mb-1">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-white/25 mb-7">
              {isSignUp
                ? 'Start tracking your entertainment journey'
                : 'Sign in to your Syllabus account'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-[11px] font-medium text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                    }
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-white/15 outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all"
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]{3,20}"
                    title="3-20 characters, letters, numbers, and underscores only"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-white/15 outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isSignUp ? 'Min 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/15 outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-colors"
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
                className="w-full bg-accent hover:bg-accent/90 active:scale-[0.98] text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2 shadow-lg shadow-accent/15"
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
          <p className="text-sm text-white/25 mt-6 text-center">
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

          {/* Subtle footer */}
          <p className="text-[11px] text-white/10 text-center mt-8">
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
