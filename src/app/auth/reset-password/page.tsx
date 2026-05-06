'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { UtensilsCrossed, Eye, EyeOff, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrength } from '@/components/auth/password-strength';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [exchangeError, setExchangeError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setExchangeError('Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.');
      return;
    }
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setExchangeError('Ο σύνδεσμος έχει λήξει. Παρακαλώ ζητήστε νέο σύνδεσμο.');
      } else {
        setReady(true);
      }
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Οι κωδικοί δεν ταιριάζουν');
      return;
    }
    if (password.length < 6) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 2500);
  }

  if (exchangeError) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-[#EF4444]" />
        </div>
        <h2 className="text-[28px] font-extrabold text-white tracking-tight mb-3">Μη έγκυρος σύνδεσμος</h2>
        <p className="text-white/55 leading-relaxed">{exchangeError}</p>
        <a
          href="/auth/forgot-password"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-bold tracking-tight transition-all"
        >
          Νέος σύνδεσμος επαναφοράς
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-[#10B981]" />
        </div>
        <h2 className="text-[28px] font-extrabold text-white tracking-tight mb-3">Ο κωδικός αλλάχθηκε!</h2>
        <p className="text-white/55">Ανακατεύθυνση στο dashboard…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-[32px] font-extrabold text-white tracking-tight leading-tight">Νέος κωδικός</h2>
        <p className="text-white/55 mt-2 text-[14px]">Ορίστε τον νέο σας κωδικό πρόσβασης.</p>
      </div>

      {!ready && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[#F97316] rounded-full animate-spin" />
        </div>
      )}

      {ready && (
        <>
          {error && (
            <div className="mb-5 px-4 py-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#FCA5A5] text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">Νέος κωδικός</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">Επιβεβαίωση κωδικού</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
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
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg',
                'bg-[#F97316] hover:bg-[#EA580C] text-white font-bold tracking-tight',
                'transition-all duration-150',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Αποθήκευση κωδικού</span>
                  <ArrowRight size={18} strokeWidth={2.6} />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center">
            <UtensilsCrossed size={18} className="text-white" strokeWidth={2.4} />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">TableFlow</span>
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/10 border-t-[#F97316] rounded-full animate-spin" />
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
