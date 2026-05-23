import { TopBar } from '@/components/ui/topbar';
import { SubscribeButton } from '@/components/billing/subscribe-button';
import { PortalButton } from '@/components/billing/portal-button';
import { getMyRestaurant } from '@/lib/supabase/server-queries';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { cookies } from 'next/headers';
import {
  Check, Zap,
  CreditCard, Shield, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';

// Read the live Pro price from Stripe so the displayed amount always matches
// what users will be charged at checkout. The env-var fallback is the
// last-resort copy for dev and for the brief window between a Stripe price
// change and the env vars being updated.
async function getProPriceLabel(): Promise<{ amount: string; interval: string }> {
  const FALLBACK = {
    amount: process.env.PRO_PRICE_FALLBACK_AMOUNT || '49,99€',
    interval: process.env.PRO_PRICE_FALLBACK_INTERVAL || '/μήνα',
  };
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return FALLBACK;
  try {
    const price = await stripe.prices.retrieve(priceId);
    if (!price.unit_amount || !price.currency) return FALLBACK;
    const amount = (price.unit_amount / 100).toLocaleString('el-GR', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
      maximumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2,
    });
    const interval =
      price.recurring?.interval === 'year' ? '/έτος' :
      price.recurring?.interval === 'week' ? '/εβδομάδα' :
      '/μήνα';
    return { amount, interval };
  } catch (err) {
    console.error('[billing] failed to read Stripe price', err);
    return FALLBACK;
  }
}

const PRO_FEATURES = [
  'Απεριόριστα τραπέζια & κρατήσεις',
  'Διαχείριση μενού',
  'Αναφορές & στατιστικά',
  'Live ενημερώσεις (Realtime)',
  'Ασφαλείς πληρωμές μέσω Stripe',
  'Ακύρωση οποτεδήποτε',
];

function StatusBanner({
  status,
  hasCustomer,
  isActiveSub,
  trialDaysLeft,
  trialExpired,
}: {
  status: string | null;
  hasCustomer: boolean;
  isActiveSub: boolean;
  trialDaysLeft: number | null;
  trialExpired: boolean;
}) {
  if (status === 'past_due') {
    return (
      <div className="flex items-start gap-3 px-5 py-4 bg-white border border-[#EF4444]/30 rounded-lg shadow-card">
        <AlertTriangle size={20} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-[#0A0A0A] tracking-tight">Η πληρωμή απέτυχε</p>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Η τελευταία χρέωση δεν πραγματοποιήθηκε. Ενημερώστε την κάρτα σας για να διατηρήσετε πρόσβαση.
          </p>
        </div>
        {hasCustomer && (
          <PortalButton className="text-[#EF4444] hover:text-[#B91C1C] whitespace-nowrap" />
        )}
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="flex items-start gap-3 px-5 py-4 bg-white border border-[#F97316]/30 rounded-lg shadow-card">
        <AlertTriangle size={20} className="text-[#F97316] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-[#0A0A0A] tracking-tight">Η συνδρομή σας έληξε</p>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Αναβαθμίστε ξανά σε Pro για να ανακτήσετε πρόσβαση στο TableFlow.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'canceling') {
    return (
      <div className="flex items-start gap-3 px-5 py-4 bg-white border border-[#F97316]/30 rounded-lg shadow-card">
        <AlertTriangle size={20} className="text-[#F97316] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-[#0A0A0A] tracking-tight">Η συνδρομή σας ακυρώνεται</p>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Έχετε πρόσβαση σε όλες τις Pro λειτουργίες μέχρι το τέλος της τρέχουσας περιόδου.
            Επαναφέρετε τη συνδρομή σας από την πύλη πληρωμών για να συνεχίσετε χωρίς διακοπή.
          </p>
        </div>
        {hasCustomer && (
          <PortalButton className="text-[#F97316] hover:text-[#EA580C] whitespace-nowrap" />
        )}
      </div>
    );
  }

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
        {hasCustomer && (
          <PortalButton className="text-[#10B981] hover:text-[#047857]" />
        )}
      </div>
    );
  }

  if (trialExpired) {
    return (
      <div className="flex items-start gap-3 px-5 py-4 bg-white border border-[#EF4444]/40 rounded-lg shadow-card">
        <AlertTriangle size={20} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-[#0A0A0A] tracking-tight">Η δωρεάν δοκιμή έληξε</p>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Αναβαθμίστε σε Pro για να συνεχίσετε να χρησιμοποιείτε το TableFlow.
          </p>
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
            Αναβαθμίστε πριν λήξει η δοκιμή για να συνεχίσετε χωρίς διακοπή.
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
  searchParams: Promise<{ success?: string; debug?: string }>;
}) {
  const { success, debug } = await searchParams;

  const restaurant = await getMyRestaurant();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const cookieRestaurantId = cookieStore.get('tf_restaurant_id')?.value ?? null;

  const debugMode = debug === '1';
  const { data: ownedRestaurants } = debugMode
    ? await supabase
        .from('restaurants')
        .select('id, name, plan, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at')
        .eq('owner_id', user?.id ?? '')
        .order('created_at', { ascending: true })
    : { data: null };

  const subStatus = restaurant?.subscription_status ?? null;
  const isActiveSub = subStatus === 'active' || subStatus === 'trialing' || subStatus === 'canceling';
  const hasCustomer = !!restaurant?.stripe_customer_id;
  const proPrice = await getProPriceLabel();

  // In-app trial maths. trial_ends_at is set on restaurant creation
  // (now() + 7 days). Show a countdown banner while it's still in the future
  // and the user hasn't subscribed yet; show the expired banner once it's
  // passed and there's still no subscription.
  const trialEndsAt = restaurant?.trial_ends_at ?? null;
  const trialEndsMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null;
  const now = Date.now();
  const trialActive = !!trialEndsMs && trialEndsMs > now;
  const trialExpired = !!trialEndsMs && trialEndsMs <= now && !isActiveSub;
  const trialDaysLeft = trialActive && !isActiveSub
    ? Math.max(1, Math.ceil((trialEndsMs! - now) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <>
      <TopBar title="Συνδρομή" subtitle="Διαχείριση πλάνου & χρεώσεων" />
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-6">

        {success === '1' && (
          <div className="flex items-center gap-3 px-5 py-4 bg-white border border-[#10B981]/30 rounded-lg shadow-card">
            <CheckCircle2 size={20} className="text-[#10B981]" />
            <p className="text-[#0A0A0A] font-semibold">
              Η πληρωμή ολοκληρώθηκε! Η συνδρομή σας θα ενεργοποιηθεί σε λίγα δευτερόλεπτα.
            </p>
          </div>
        )}

        <StatusBanner
          status={subStatus}
          hasCustomer={hasCustomer}
          isActiveSub={isActiveSub}
          trialDaysLeft={trialDaysLeft}
          trialExpired={trialExpired}
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
              selected_stripe_subscription_id: restaurant?.stripe_subscription_id ?? null,
              selected_stripe_customer_id: restaurant?.stripe_customer_id ?? null,
              derived_isActiveSub: isActiveSub,
              derived_trialActive: trialActive,
              derived_trialExpired: trialExpired,
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
              7 ημέρες δωρεάν δοκιμή. Χωρίς δέσμευση — ακυρώστε όποτε θέλετε.
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
                <div className="flex items-baseline gap-1.5 mt-3">
                  <span
                    className="text-[64px] md:text-[80px] font-extrabold tracking-tight leading-none"
                    style={{
                      background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {proPrice.amount}
                  </span>
                  <span className="text-[14px] md:text-[15px] font-bold text-[#6B7280]">{proPrice.interval}</span>
                </div>
                <p className="text-[13px] mt-3 text-[#0A0A0A] font-medium">
                  Δωρεάν για 7 ημέρες, στη συνέχεια αυτόματη χρέωση μέσω Stripe.
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
                  <SubscribeButton
                    plan="pro"
                    className="shimmer-cta py-4 text-[14px] md:text-[15px] tracking-tight rounded-xl text-white shadow-orange-glow"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-[#0A0A0A]" />
            <h3 className="font-bold text-[#0A0A0A] tracking-tight">Στοιχεία Πληρωμής</h3>
          </div>
          <div className="bg-[#F8F8F8] border border-[#E5E7EB] rounded-lg p-4 flex items-center gap-4">
            <div className="w-12 h-8 bg-[#0A0A0A] rounded-md flex items-center justify-center">
              <span className="text-[10px] font-bold text-white tracking-wider">VISA</span>
            </div>
            <div className="flex-1">
              {hasCustomer ? (
                <>
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">Διαχειριστείτε τα στοιχεία πληρωμής σας</p>
                  <p className="text-[12px] text-[#6B7280]">Ακύρωση, αλλαγή κάρτας ή προβολή ιστορικού χρεώσεων</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">Δεν έχει προστεθεί κάρτα πληρωμής</p>
                  <p className="text-[12px] text-[#6B7280]">Προσθέστε κάρτα κατά την ενεργοποίηση του Pro</p>
                </>
              )}
            </div>
            {hasCustomer && (
              <PortalButton className="text-[#F97316] hover:text-[#EA580C]" />
            )}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-3 flex items-center gap-1.5">
            <Shield size={12} />
            Ασφαλείς συναλλαγές μέσω Stripe. Ακύρωση οποτεδήποτε.
          </p>
        </div>

      </div>
    </>
  );
}
