import { redirect } from 'next/navigation';
import { Lock, Phone, Mail, UtensilsCrossed, Sparkles, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyRestaurant } from '@/lib/supabase/server-queries';
import { isAccessAllowed } from '@/lib/stripe';
import { logout } from '@/app/actions/auth';

const CONTACT_PHONE = '6983151294';
const CONTACT_PHONE_DISPLAY = '698 315 1294';
const CONTACT_EMAIL = 'TableFlow2026@gmail.com';

export const metadata = {
  title: 'Η δοκιμή σας έληξε — TableFlow',
};

export default async function TrialEndedPage() {
  // If the user is signed in and somehow still has access (paid sub, or the
  // trial clock got extended), don't show the lock screen — bounce them back
  // into the dashboard. The proxy is the primary gate; this is belt-and-braces.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const restaurant = await getMyRestaurant();
  if (restaurant && isAccessAllowed(restaurant.subscription_status ?? null, restaurant.trial_ends_at ?? null)) {
    redirect('/dashboard');
  }

  const mailtoSubject = encodeURIComponent('Συνέχιση συνδρομής TableFlow');
  const mailtoBody = encodeURIComponent(
    `Γεια σας,\n\nΘα ήθελα να συνεχίσω να χρησιμοποιώ το TableFlow μετά τη λήξη της δοκιμής.\n\nΕυχαριστώ.`
  );
  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: '#F5EDDC' }}>
      <div className="w-full max-w-[560px]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#F97316] flex items-center justify-center">
            <UtensilsCrossed size={20} className="text-white" strokeWidth={2.4} />
          </div>
          <span className="text-[#0A0A0A] text-2xl font-bold tracking-tight">TableFlow</span>
        </div>

        <div className="relative bg-white rounded-2xl shadow-card border border-black/5 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: 'linear-gradient(90deg, #FB923C 0%, #F97316 50%, #EA580C 100%)' }} />

          <div className="px-7 md:px-10 pt-9 pb-8 text-center">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6"
              style={{
                background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
                boxShadow: '0 12px 28px rgba(249, 115, 22, 0.32), inset 0 1px 0 rgba(255,255,255,0.30)',
              }}
            >
              <Lock size={28} className="text-white" strokeWidth={2.4} />
            </div>

            <h1 className="text-[28px] md:text-[32px] font-extrabold tracking-tight text-[#0A0A0A] leading-tight">
              Η δωρεάν δοκιμή σας έληξε
            </h1>
            <p className="text-[15px] text-[#6B7280] mt-3 leading-relaxed max-w-[440px] mx-auto">
              Ελπίζουμε να σας άρεσε το TableFlow! Για να συνεχίσετε, επικοινωνήστε μαζί μας:
            </p>

            <div className="mt-7 space-y-3 text-left">
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="flex items-center gap-4 px-5 py-4 rounded-xl bg-[#F8F8F8] border border-[#E5E7EB] hover:border-[#F97316]/40 hover:bg-white transition-colors group"
              >
                <span className="w-11 h-11 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center group-hover:border-[#F97316]/30">
                  <Phone size={18} className="text-[#F97316]" strokeWidth={2.4} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6B7280]">Τηλέφωνο</p>
                  <p className="text-[16px] font-bold text-[#0A0A0A] tracking-tight">{CONTACT_PHONE_DISPLAY}</p>
                </div>
              </a>

              <a
                href={mailtoHref}
                className="flex items-center gap-4 px-5 py-4 rounded-xl bg-[#F8F8F8] border border-[#E5E7EB] hover:border-[#F97316]/40 hover:bg-white transition-colors group"
              >
                <span className="w-11 h-11 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center group-hover:border-[#F97316]/30">
                  <Mail size={18} className="text-[#F97316]" strokeWidth={2.4} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6B7280]">Email</p>
                  <p className="text-[15px] md:text-[16px] font-bold text-[#0A0A0A] tracking-tight break-all">{CONTACT_EMAIL}</p>
                </div>
              </a>
            </div>

            <a
              href={mailtoHref}
              className="mt-7 w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl text-white font-extrabold tracking-tight text-[15px] transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
                boxShadow: '0 10px 24px rgba(249, 115, 22, 0.30)',
              }}
            >
              <Sparkles size={17} strokeWidth={2.6} />
              Επικοινωνία
            </a>

            <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-[#6B7280]">
              <ShieldCheck size={14} className="text-[#10B981]" />
              <span>Τα δεδομένα σας είναι ασφαλή και σας περιμένουν.</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <form action={logout}>
            <button
              type="submit"
              className="text-[13px] text-[#6B7280] hover:text-[#0A0A0A] font-semibold transition-colors"
            >
              Αποσύνδεση
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
