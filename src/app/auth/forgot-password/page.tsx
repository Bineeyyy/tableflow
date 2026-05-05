'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forgotPassword } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center">
            <UtensilsCrossed size={18} className="text-white" strokeWidth={2.4} />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">TableFlow</span>
        </div>

        {state?.success ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-[#10B981]" />
            </div>
            <h2 className="text-[28px] font-extrabold text-white tracking-tight mb-3">Ελέγξτε το email σας</h2>
            <p className="text-white/55 leading-relaxed">
              Αν ο λογαριασμός υπάρχει, θα λάβετε σύνδεσμο επαναφοράς κωδικού στα επόμενα λεπτά.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 mt-8 text-[13px] text-[#F97316] hover:text-[#FB923C] font-semibold transition-colors"
            >
              <ArrowLeft size={15} />
              Επιστροφή στη σύνδεση
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-[32px] font-extrabold text-white tracking-tight leading-tight">Επαναφορά κωδικού</h2>
              <p className="text-white/55 mt-2 text-[14px]">
                Εισάγετε το email σας και θα σας στείλουμε σύνδεσμο επαναφοράς.
              </p>
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

              <button
                type="submit"
                disabled={pending}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg',
                  'bg-[#F97316] hover:bg-[#EA580C] text-white font-bold tracking-tight',
                  'transition-all duration-150',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {pending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Αποστολή συνδέσμου</span>
                    <ArrowRight size={18} strokeWidth={2.6} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-[13px] text-white/50 hover:text-[#F97316] transition-colors font-medium"
              >
                <ArrowLeft size={15} />
                Επιστροφή στη σύνδεση
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
