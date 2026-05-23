import { TopBar } from '@/components/ui/topbar';
import { getMyRestaurant } from '@/lib/supabase/server-queries';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import {
  Check, Zap, Phone, Mail, Sparkles,
  CheckCircle2, Clock,
} from 'lucide-react';

const CONTACT_PHONE = '6983151294';
const CONTACT_PHONE_DISPLAY = '698 315 1294';
const CONTACT_EMAIL = 'TableFlow2026@gmail.com';

const PRO_FEATURES = [
  'Απεριόριστα τραπέζια & κρατήσεις',
  'Διαχείριση μενού',
  'Αναφορές & στατιστικά',
  'Live ενημερώσεις (Realtime)',
  'Δωρεάν υποστήριξη',
  'Ακύρωση οποτεδήποτε',
];

function TrialBanner({
  trialDaysLeft,
  isActiveSub,
  status,
}: {
  trialDaysLeft: number | null;
  isActiveSub: boolean;
  status: string | null;
}) {
  if (isActiveSub) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-white border border-[#10B981]/30 rounded-lg shadow-card">
        <CheckCircle2 size={20} className="text-[#10B981] flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-[#0A0A0A] tracking-tight">
            Συνδρομή Pro {status === 'trialing' ? '(Δοκιμαστική)' : 'ενεργή'}
          </p>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Έχετε πλήρη πρόσβαση στο TableFlow.</p>
        </div>
      </div>
    );
  }

  if (trialDaysLeft !== null) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-white border border-[#F97316]/30 rounded-lg shadow-card">
        <Clock size={20} className="text-[#F97316] flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-[#0A0A0A] tracking-tight">
            Δωρεάν δοκιμή · {trialDaysLeft} {trialDaysLeft === 1 ? 'ημέρα' : 'ημέρες'} ακόμα
          </p>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Επικοινωνήστε μαζί μας πριν λήξει η δοκιμή για να συνεχίσετε χωρίς διακοπή.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const { debug } = await searchParams;

  const restaurant = await getMyRestaurant();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const cookieRestaurantId = cookieStore.get('tf_restaurant_id')?.value ?? null;

  const debugMode = debug === '1';
  const { data: ownedRestaurants } = debugMode
    ? await supabase
        .from('restaurants')
        .select('id, name, plan, subscription_status, trial_ends_at, created_at')
        .eq('owner_id', user?.id ?? '')
        .order('created_at', { ascending: true })
    : { data: null };

  const subStatus = restaurant?.subscription_status ?? null;
  const isActiveSub = subStatus === 'active' || subStatus === 'trialing' || subStatus === 'canceling';

  // In-app trial maths. trial_ends_at is set on restaurant creation
  // (now() + 7 days). Show a countdown banner while it's still in the future
  // and the user hasn't subscribed yet. Expired users are redirected to
  // /trial-ended by the proxy before they can reach this page.
  const trialEndsAt = restaurant?.trial_ends_at ?? null;
  const trialEndsMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null;
  const now = Date.now();
  const trialActive = !!trialEndsMs && trialEndsMs > now;
  const trialDaysLeft = trialActive && !isActiveSub
    ? Math.max(1, Math.ceil((trialEndsMs! - now) / (1000 * 60 * 60 * 24)))
    : null;

  const mailtoSubject = encodeURIComponent('Συνέχιση συνδρομής TableFlow');
  const mailtoBody = encodeURIComponent(
    `Γεια σας,\n\nΘα ήθελα να συνεχίσω να χρησιμοποιώ το TableFlow μετά τη δοκιμή.\n\nΕυχαριστώ.`
  );
  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <>
      <TopBar title="Συνδρομή" subtitle="Διαχείριση πλάνου & επικοινωνία" />
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-6">

        <TrialBanner
          trialDaysLeft={trialDaysLeft}
          isActiveSub={isActiveSub}
          status={subStatus}
        />

        {debug === '1' && (
          <div className="bg-[#0A0A0A] rounded-lg p-5 text-[12px] text-white/90 font-mono overflow-x-auto">
            <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#F97316] mb-3">Billing Debug</div>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify({
              user_id: user?.id ?? null,
              cookie_tf_restaurant_id: cookieRestaurantId,
              selected_restaurant_id: restaurant?.id ?? null,
              selected_subscription_status: subStatus,
              selected_trial_ends_at: trialEndsAt,
              derived_isActiveSub: isActiveSub,
              derived_trialActive: trialActive,
              derived_trialDaysLeft: trialDaysLeft,
              owned_restaurants_count: ownedRestaurants?.length ?? 0,
              owned_restaurants: ownedRestaurants ?? [],
            }, null, 2)}</pre>
          </div>
        )}

        {/* ─── Single Pro plan ─────────────────────────────────────────── */}
        <div className="max-w-[520px] mx-auto pt-2 md:pt-6 w-full">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-[28px] md:text-[36px] font-extrabold text-[#0A0A0A] tracking-tight leading-tight">
              TableFlow Pro
            </h2>
            <p className="text-[14px] md:text-[15px] text-[#6B7280] mt-2">
              7 ημέρες δωρεάν δοκιμή. Χωρίς κάρτα, χωρίς δέσμευση.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="popular-ribbon text-white text-[11px] md:text-[12px] font-extrabold uppercase tracking-[0.18em] px-4 py-1.5 rounded-full whitespace-nowrap">
                7 ΗΜΕΡΕΣ ΔΩΡΕΑΝ
              </div>
            </div>

            <div className="pro-card rounded-2xl flex flex-col h-full">
              <div className="p-7 md:p-8 pt-9 md:pt-10 bg-gradient-to-b from-[#FFF7ED] to-white rounded-t-[14px]">
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
                    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.35), inset 0 1px 0 rgba(255,255,255,0.30)',
                  }}
                >
                  <Zap size={24} className="text-white" strokeWidth={2.4} />
                </div>
                <h3 className="text-[24px] md:text-[26px] font-extrabold tracking-tight text-[#0A0A0A]">Pro</h3>
                <p className="text-[13px] mt-3 text-[#0A0A0A] font-medium">
                  Δωρεάν για 7 ημέρες. Επικοινωνήστε μαζί μας για να συνεχίσετε μετά τη δοκιμή.
                </p>
              </div>

              <div className="px-7 md:px-8 py-6 flex-1 space-y-3 border-t border-[#F97316]/10">
                {PRO_FEATURES.map((label, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                      <Check size={13} className="text-[#10B981]" strokeWidth={3} />
                    </span>
                    <span className="text-[14px] text-[#0A0A0A] font-semibold">{label}</span>
                  </div>
                ))}
              </div>

              <div className="px-7 md:px-8 pb-7 md:pb-8">
                {isActiveSub ? (
                  <div className="w-full py-4 rounded-xl text-[14px] font-bold bg-[#10B981]/10 text-[#047857] flex items-center justify-center gap-2 ring-1 ring-inset ring-[#10B981]/20">
                    <Check size={16} strokeWidth={2.8} />
                    Είστε σε Pro
                  </div>
                ) : (
                  <a
                    href={mailtoHref}
                    className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl text-white font-extrabold tracking-tight text-[14px] md:text-[15px] transition-transform active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
                      boxShadow: '0 10px 24px rgba(249, 115, 22, 0.30)',
                    }}
                  >
                    <Sparkles size={16} strokeWidth={2.6} />
                    Επικοινωνία για συνέχιση
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Contact info card ───────────────────────────────────────── */}
        <div className="max-w-[520px] mx-auto w-full">
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
            <h3 className="font-bold text-[#0A0A0A] tracking-tight mb-4">Επικοινωνία</h3>
            <div className="space-y-3">
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E7EB] hover:border-[#F97316]/40 hover:bg-white transition-colors group"
              >
                <span className="w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center group-hover:border-[#F97316]/30">
                  <Phone size={16} className="text-[#F97316]" strokeWidth={2.4} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6B7280]">Τηλέφωνο</p>
                  <p className="text-[15px] font-bold text-[#0A0A0A] tracking-tight">{CONTACT_PHONE_DISPLAY}</p>
                </div>
              </a>

              <a
                href={mailtoHref}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E7EB] hover:border-[#F97316]/40 hover:bg-white transition-colors group"
              >
                <span className="w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center group-hover:border-[#F97316]/30">
                  <Mail size={16} className="text-[#F97316]" strokeWidth={2.4} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6B7280]">Email</p>
                  <p className="text-[14px] md:text-[15px] font-bold text-[#0A0A0A] tracking-tight break-all">{CONTACT_EMAIL}</p>
                </div>
              </a>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
