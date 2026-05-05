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
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
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
            Ξεκινήστε<br />
            <span className="text-[#F97316]">δωρεάν σήμερα</span>
          </h1>
          <p className="mt-6 text-white/55 text-[17px] leading-relaxed max-w-sm">
            Δημιουργήστε τον λογαριασμό σας και αρχίστε να διαχειρίζεστε το εστιατόριό σας αμέσως.
          </p>
        </div>
        <div className="relative z-10">
          <div className="space-y-3">
            {['Δωρεάν 14 ημέρες δοκιμή', 'Χωρίς πιστωτική κάρτα', 'Ακύρωση ανά πάσα στιγμή'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-white/70 text-[14px]">
                <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-bold">✓</span>
                </div>
                {item}
              </div>
            ))}
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
            <h2 className="text-[32px] font-extrabold text-white tracking-tight leading-tight">Δημιουργία λογαριασμού</h2>
            <p className="text-white/50 mt-2 text-[14px]">Συμπληρώστε τα στοιχεία σας για να ξεκινήσετε</p>
          </div>

          {state?.error && (
            <div className="mb-5 px-4 py-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#FCA5A5] text-[13px]">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">Ονοματεπώνυμο</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Αλέξης Παπαδόπουλος"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
              />
            </div>
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
                  minLength={6}
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
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">Επαλήθευση κωδικού</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
                  <span>Δημιουργία λογαριασμού</span>
                  <ArrowRight size={18} strokeWidth={2.6} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-white/50 text-[13px]">
            Έχετε ήδη λογαριασμό;{' '}
            <Link href="/auth/login" className="text-[#F97316] hover:text-[#FB923C] font-semibold transition-colors">
              Σύνδεση
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
