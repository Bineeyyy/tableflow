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
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 bg-[#0A0A0A]">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
        {/* Subtle orange glow accent */}
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 60%)' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-lg bg-[#F97316] flex items-center justify-center">
              <UtensilsCrossed size={22} className="text-white" strokeWidth={2.4} />
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">TableFlow</span>
          </div>
          <h1 className="text-[56px] font-extrabold text-white leading-[1.05] tracking-tight">
            Διαχειριστείτε το<br />
            <span className="text-[#F97316]">εστιατόριό σας</span><br />
            με ευκολία.
          </h1>
          <p className="mt-6 text-white/55 text-[17px] leading-relaxed max-w-sm">
            Παρακολουθήστε τα τραπέζια, διαχειριστείτε παραγγελίες και κρατήσεις σε πραγματικό χρόνο.
          </p>
        </div>
        <div className="relative z-10">
          <div className="flex gap-8 text-white/50 text-[12px]">
            <div>
              <div className="text-[28px] font-extrabold text-white tracking-tight">500+</div>
              <div className="uppercase tracking-wider mt-1">Εστιατόρια</div>
            </div>
            <div>
              <div className="text-[28px] font-extrabold text-white tracking-tight">50K+</div>
              <div className="uppercase tracking-wider mt-1">Τραπέζια</div>
            </div>
            <div>
              <div className="text-[28px] font-extrabold text-white tracking-tight">99.9%</div>
              <div className="uppercase tracking-wider mt-1">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0A0A0A]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center">
              <UtensilsCrossed size={18} className="text-white" strokeWidth={2.4} />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">TableFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[32px] font-extrabold text-white tracking-tight leading-tight">Καλώς ήρθατε</h2>
            <p className="text-white/50 mt-2 text-[14px]">Συνδεθείτε στον λογαριασμό σας</p>
          </div>

          {state?.error && (
            <div className="mb-5 px-4 py-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#FCA5A5] text-[13px]">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="alexis@taverna.gr"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">Κωδικός</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <Link href="/auth/forgot-password" className="text-[12px] text-white/50 hover:text-[#F97316] transition-colors font-medium">
                  Ξεχάσατε τον κωδικό;
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#F97316] focus:ring-[#F97316] focus:ring-offset-0 cursor-pointer accent-[#F97316]"
              />
              <label htmlFor="rememberMe" className="text-[13px] text-white/60 cursor-pointer select-none">
                Να με θυμάσαι
              </label>
            </div>

            <button
              type="submit"
              disabled={pending}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg',
                'bg-[#F97316] hover:bg-[#EA580C] text-white font-bold tracking-tight',
                'transition-all duration-150',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'active:scale-[0.98]'
              )}
            >
              {pending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Σύνδεση</span>
                  <ArrowRight size={18} strokeWidth={2.6} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-white/50 text-[13px]">
            Δεν έχετε λογαριασμό;{' '}
            <Link href="/auth/register" className="text-[#F97316] hover:text-[#FB923C] font-semibold transition-colors">
              Εγγραφή δωρεάν
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
