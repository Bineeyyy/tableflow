'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { UtensilsCrossed, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-stone-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(135deg, #C1623F 0%, #A04E2E 50%, #1c0f0a 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <UtensilsCrossed size={22} className="text-white" />
            </div>
            <span className="text-white text-2xl font-bold">TableFlow</span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight">
            Διαχειριστείτε το<br />
            <span className="text-white/70">εστιατόριό σας</span><br />
            με ευκολία
          </h1>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-sm">
            Παρακολουθήστε τα τραπέζια, διαχειριστείτε παραγγελίες και κρατήσεις σε πραγματικό χρόνο.
          </p>
        </div>
        <div className="relative z-10">
          <div className="flex gap-6 text-white/50 text-sm">
            <div>
              <div className="text-3xl font-bold text-white">500+</div>
              <div>Εστιατόρια</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">50K+</div>
              <div>Τραπέζια</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div>Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-terracotta flex items-center justify-center">
              <UtensilsCrossed size={18} className="text-white" />
            </div>
            <span className="text-white text-xl font-bold">TableFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Καλώς ήρθατε</h2>
            <p className="text-stone-400 mt-2">Συνδεθείτε στον λογαριασμό σας</p>
          </div>

          {state?.error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="alexis@taverna.gr"
                className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Κωδικός</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <Link href="/auth/forgot-password" className="text-xs text-stone-400 hover:text-terracotta transition-colors">
                  Ξεχάσατε τον κωδικό;
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                className="w-4 h-4 rounded border-stone-600 bg-stone-800 text-terracotta focus:ring-terracotta focus:ring-offset-0 cursor-pointer accent-[#C1623F]"
              />
              <label htmlFor="rememberMe" className="text-sm text-stone-400 cursor-pointer select-none">
                Να με θυμάσαι
              </label>
            </div>

            <button
              type="submit"
              disabled={pending}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl',
                'bg-terracotta hover:bg-terracotta-dark text-white font-semibold',
                'transition-all duration-200 shadow-lg shadow-terracotta/30',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'active:scale-98'
              )}
            >
              {pending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Σύνδεση</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-stone-500 text-sm">
            Δεν έχετε λογαριασμό;{' '}
            <Link href="/auth/register" className="text-terracotta hover:text-terracotta-light font-medium transition-colors">
              Εγγραφή δωρεάν
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
