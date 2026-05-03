'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forgotPassword } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-terracotta flex items-center justify-center">
            <UtensilsCrossed size={18} className="text-white" />
          </div>
          <span className="text-white text-xl font-bold">TableFlow</span>
        </div>

        {state?.success ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Ελέγξτε το email σας</h2>
            <p className="text-stone-400 leading-relaxed">
              Αν ο λογαριασμός υπάρχει, θα λάβετε σύνδεσμο επαναφοράς κωδικού στα επόμενα λεπτά.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 mt-8 text-sm text-terracotta hover:text-terracotta-light font-medium transition-colors"
            >
              <ArrowLeft size={15} />
              Επιστροφή στη σύνδεση
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white">Επαναφορά κωδικού</h2>
              <p className="text-stone-400 mt-2">
                Εισάγετε το email σας και θα σας στείλουμε σύνδεσμο επαναφοράς.
              </p>
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

              <button
                type="submit"
                disabled={pending}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl',
                  'bg-terracotta hover:bg-terracotta-dark text-white font-semibold',
                  'transition-all duration-200 shadow-lg shadow-terracotta/30',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {pending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Αποστολή συνδέσμου</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-terracotta transition-colors"
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
