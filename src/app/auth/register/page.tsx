'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { UtensilsCrossed, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { register } from '@/app/actions/auth';

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
            Ξεκινήστε<br />
            <span className="text-white/70">δωρεάν σήμερα</span>
          </h1>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-sm">
            Δημιουργήστε τον λογαριασμό σας και αρχίστε να διαχειρίζεστε το εστιατόριό σας αμέσως.
          </p>
        </div>
        <div className="relative z-10">
          <div className="space-y-3">
            {['Δωρεάν 14 ημέρες δοκιμή', 'Χωρίς πιστωτική κάρτα', 'Ακύρωση ανά πάσα στιγμή'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                {item}
              </div>
            ))}
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
            <h2 className="text-3xl font-bold text-white">Δημιουργία λογαριασμού</h2>
            <p className="text-stone-400 mt-2">Συμπληρώστε τα στοιχεία σας για να ξεκινήσετε</p>
          </div>

          {state?.error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Ονοματεπώνυμο</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Αλέξης Παπαδόπουλος"
                className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors"
              />
            </div>
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
                  minLength={6}
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
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Επαλήθευση κωδικού</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
                  <span>Δημιουργία λογαριασμού</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-stone-500 text-sm">
            Έχετε ήδη λογαριασμό;{' '}
            <Link href="/auth/login" className="text-terracotta hover:text-terracotta-light font-medium transition-colors">
              Σύνδεση
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
