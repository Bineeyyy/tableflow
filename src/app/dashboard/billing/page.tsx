import { TopBar } from '@/components/ui/topbar';
import { SubscribeButton } from '@/components/billing/subscribe-button';
import { PortalButton } from '@/components/billing/portal-button';
import { getMyRestaurant } from '@/lib/supabase/server-queries';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { cookies } from 'next/headers';
import {
  Check, X, Zap, Star,
  CreditCard, Shield, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Read the live price from Stripe so the displayed amount always matches what
// users will be charged at checkout. Falls back to the marketing price (29€)
// if Stripe isn't reachable or the env var isn't set.
async function getProPriceLabel(): Promise<{ amount: string; interval: string }> {
  const FALLBACK = { amount: '29€', interval: '/μήνα' };
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

// Honest plan composition: every shipped feature is in Free. Pro is a
// supporter tier — it doesn't gate functionality, it funds development and
// offers priority support. We deliberately do NOT list features that aren't
// in the codebase yet (SMS, multi-user, exports) so customers don't pay for
// vapor.
const PLAN_META = {
  free: {
    name: 'Δωρεάν',
    price: '0€',
    period: '/μήνα',
    description: 'Πλήρης πρόσβαση στις τρέχουσες δυνατότητες',
    Icon: Star,
    color: 'border-[#E5E7EB]',
    headerBg: 'bg-[#F8F8F8]',
    headerText: 'text-[#0A0A0A]',
    subText: 'text-[#6B7280]',
    iconBg: 'bg-[#E5E7EB] text-[#6B7280]',
    features: [
      { label: 'Διαχείριση τραπεζιών & κάτοψη', ok: true },
      { label: 'Κρατήσεις', ok: true },
      { label: 'Διαχείριση μενού', ok: true },
      { label: 'Αναφορές & στατιστικά', ok: true },
      { label: 'Live ενημερώσεις (Realtime)', ok: true },
    ],
  },
  pro: {
    name: 'Pro',
    price: '29€',
    period: '/μήνα',
    description: 'Στηρίξτε την ανάπτυξη και αποκτήστε προτεραιότητα',
    Icon: Zap,
    color: 'border-[#F97316]',
    headerBg: 'bg-[#0A0A0A]',
    headerText: 'text-white',
    subText: 'text-white/60',
    iconBg: 'bg-[#F97316] text-white',
    badge: 'Στήριξη',
    features: [
      { label: 'Όλες οι λειτουργίες του Δωρεάν', ok: true },
      { label: 'Στήριξη της ανάπτυξης', ok: true },
      { label: 'Προτεραιότητα στην υποστήριξη', ok: true },
      { label: 'Πρόωρη πρόσβαση σε νέες δυνατότητες', ok: true },
    ],
  },
};

function StatusBanner({
  plan,
  status,
  hasCustomer,
  isActiveSub,
}: {
  plan: string;
  status: string | null;
  hasCustomer: boolean;
  isActiveSub: boolean;
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
            Ο λογαριασμός σας μεταφέρθηκε στο δωρεάν πλάνο. Αναβαθμίστε για να ανακτήσετε πρόσβαση σε Pro λειτουργίες.
          </p>
        </div>
      </div>
    );
  }

  // subscription_status is the source of truth — `plan` column may lag behind.
  if (isActiveSub) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-white border border-[#10B981]/30 rounded-lg shadow-card">
        <CheckCircle2 size={20} className="text-[#10B981] flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-[#0A0A0A] tracking-tight">
            Συνδρομή Pro {status === 'trialing' ? '(Δοκιμαστική)' : 'ενεργή'}
          </p>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Έχετε πρόσβαση σε όλες τις Pro λειτουργίες.</p>
        </div>
        {hasCustomer && (
          <PortalButton className="text-[#10B981] hover:text-[#047857]" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-white border border-[#E5E7EB] rounded-lg shadow-card">
      <div className="w-10 h-10 rounded-lg bg-[#F8F8F8] flex items-center justify-center flex-shrink-0">
        <Shield size={18} className="text-[#6B7280]" />
      </div>
      <div>
        <p className="font-bold text-[#0A0A0A] tracking-tight">
          Τρέχον Πλάνο: <span className="text-[#F97316] capitalize">{plan}</span>
        </p>
        <p className="text-[13px] text-[#6B7280]">Αναβαθμίστε για περισσότερες δυνατότητες</p>
      </div>
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; debug?: string }>;
}) {
  const { success, debug } = await searchParams;

  // Pull the selected restaurant + the full owned-list for debugging visibility.
  // getMyRestaurant() applies the same cookie-pinning rule used elsewhere.
  const restaurant = await getMyRestaurant();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const cookieRestaurantId = cookieStore.get('tf_restaurant_id')?.value ?? null;

  // Only fetch the owned-restaurants list when the debug pane is open. We used
  // to fetch it on every page load and dump it (with stripe_customer_id,
  // stripe_subscription_id, and emails) into Vercel logs as PII — the audit
  // flagged that as the worst offender on this page.
  const debugMode = debug === '1';
  const { data: ownedRestaurants } = debugMode
    ? await supabase
        .from('restaurants')
        .select('id, name, plan, subscription_status, stripe_customer_id, stripe_subscription_id, created_at')
        .eq('owner_id', user?.id ?? '')
        .order('created_at', { ascending: true })
    : { data: null };

  // Minimal page-load breadcrumb — no IDs, no stripe identifiers, no emails.
  // The debug pane below still surfaces the full snapshot to whoever opens it
  // with ?debug=1, which is restricted to the signed-in owner anyway.
  console.log('[billing] page load', JSON.stringify({
    has_restaurant: !!restaurant,
    plan: restaurant?.plan ?? null,
    subscription_status: restaurant?.subscription_status ?? null,
  }));

  const rawPlan = restaurant?.plan ?? 'free';
  const subStatus = restaurant?.subscription_status ?? null;
  const isActiveSub = subStatus === 'active' || subStatus === 'trialing';

  // subscription_status is the canonical source of truth. If the subscription is
  // active in Stripe (or someone manually flipped it in Supabase) but the `plan`
  // column wasn't bumped — treat the user as Pro for display purposes.
  const currentPlan = isActiveSub && rawPlan === 'free' ? 'pro' : rawPlan;
  const planMismatch = isActiveSub && rawPlan === 'free';
  const hasCustomer = !!restaurant?.stripe_customer_id;
  const proPrice = await getProPriceLabel();

  return (
    <>
      <TopBar title="Συνδρομή" subtitle="Διαχείριση πλάνου & χρεώσεων" />
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-6">

        {/* Post-checkout success notice */}
        {success === '1' && (
          <div className="flex items-center gap-3 px-5 py-4 bg-white border border-[#10B981]/30 rounded-lg shadow-card">
            <CheckCircle2 size={20} className="text-[#10B981]" />
            <p className="text-[#0A0A0A] font-semibold">
              Η πληρωμή ολοκληρώθηκε! Η συνδρομή σας θα ενεργοποιηθεί σε λίγα δευτερόλεπτα.
            </p>
          </div>
        )}

        {/* Status banner */}
        <StatusBanner plan={currentPlan} status={subStatus} hasCustomer={hasCustomer} isActiveSub={isActiveSub} />

        {/* Mismatch warning — visible to the owner only when subscription_status
            says active but the plan column is still 'free'. Means the webhook
            didn't bump plan, OR someone set status manually. */}
        {planMismatch && (
          <div className="flex items-start gap-3 px-5 py-4 bg-white border border-[#F97316]/30 rounded-lg shadow-card">
            <AlertTriangle size={18} className="text-[#F97316] mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-[13px]">
              <p className="font-bold text-[#0A0A0A] tracking-tight">Ασυμφωνία plan vs subscription_status</p>
              <p className="text-[#6B7280] mt-0.5">
                Η συνδρομή είναι ενεργή στο Stripe, αλλά η στήλη <code className="font-mono">plan</code> εξακολουθεί να είναι <code className="font-mono">free</code>.
                Αυτό συνήθως σημαίνει ότι ο webhook δεν ενημέρωσε το <code className="font-mono">plan</code>. Ορίστε χειροκίνητα <code className="font-mono">plan = &apos;pro&apos;</code> ή ελέγξτε τα logs του webhook.
              </p>
            </div>
          </div>
        )}

        {/* Debug pane — visible only with ?debug=1 query string */}
        {debug === '1' && (
          <div className="bg-[#0A0A0A] rounded-lg p-5 text-[12px] text-white/90 font-mono overflow-x-auto">
            <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#F97316] mb-3">Billing Debug</div>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify({
              user_id: user?.id ?? null,
              cookie_tf_restaurant_id: cookieRestaurantId,
              selected_restaurant_id: restaurant?.id ?? null,
              selected_plan_raw: rawPlan,
              selected_subscription_status: subStatus,
              selected_stripe_subscription_id: restaurant?.stripe_subscription_id ?? null,
              selected_stripe_customer_id: restaurant?.stripe_customer_id ?? null,
              derived_currentPlan: currentPlan,
              derived_isActiveSub: isActiveSub,
              owned_restaurants_count: ownedRestaurants?.length ?? 0,
              owned_restaurants: ownedRestaurants ?? [],
            }, null, 2)}</pre>
          </div>
        )}

        {/* ─── Plan headline + cards ──────────────────────────────────────── */}
        <div className="max-w-[800px] mx-auto pt-2 md:pt-6 w-full">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-[28px] md:text-[36px] font-extrabold text-[#0A0A0A] tracking-tight leading-tight">
              Επιλέξτε το πλάνο σας
            </h2>
            <p className="text-[14px] md:text-[15px] text-[#6B7280] mt-2">
              Όλες οι δυνατότητες είναι διαθέσιμες δωρεάν. Με το Pro στηρίζετε την ανάπτυξη της πλατφόρμας.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch">
            {/* ─── FREE — visually demoted ─────────────────────────────── */}
            {(() => {
              const free = PLAN_META.free;
              const FreeIcon = free.Icon;
              const isCurrent = currentPlan === 'free';
              return (
                <div className="relative bg-white rounded-2xl border border-[#E5E7EB] flex flex-col opacity-80 hover:opacity-100 transition-opacity">
                  <div className="p-7 md:p-8">
                    <div className="w-11 h-11 rounded-lg bg-[#F8F8F8] border border-[#E5E7EB] flex items-center justify-center mb-5">
                      <FreeIcon size={20} className="text-[#9CA3AF]" strokeWidth={2.2} />
                    </div>
                    <h3 className="text-[20px] font-bold tracking-tight text-[#6B7280]">{free.name}</h3>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-[44px] md:text-[52px] font-extrabold tracking-tight leading-none text-[#9CA3AF]">
                        {free.price}
                      </span>
                      <span className="text-[13px] font-medium text-[#9CA3AF]">{free.period}</span>
                    </div>
                    <p className="text-[13px] mt-3 text-[#9CA3AF]">{free.description}</p>
                  </div>

                  <div className="px-7 md:px-8 py-5 flex-1 space-y-2.5 border-t border-[#E5E7EB]">
                    {free.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {f.ok
                          ? <Check size={15} className="text-[#9CA3AF] flex-shrink-0" strokeWidth={2.4} />
                          : <X size={15} className="text-[#D1D5DB] flex-shrink-0" />}
                        <span className={cn('text-[13px]', f.ok ? 'text-[#6B7280]' : 'text-[#D1D5DB] line-through')}>
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="px-7 md:px-8 pb-7 md:pb-8">
                    {isCurrent ? (
                      <div className="w-full py-3.5 rounded-lg text-[13px] font-bold bg-[#F8F8F8] text-[#6B7280] flex items-center justify-center gap-2 border border-[#E5E7EB]">
                        <Check size={15} strokeWidth={2.6} />
                        Τρέχον Πλάνο
                      </div>
                    ) : (
                      <div className="w-full py-3.5 rounded-lg text-[13px] font-semibold bg-[#F8F8F8] text-[#9CA3AF] flex items-center justify-center border border-[#E5E7EB]">
                        Δωρεάν πλάνο
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ─── PRO — animated, glowing, irresistible ───────────────── */}
            {(() => {
              const pro = PLAN_META.pro;
              const ProIcon = pro.Icon;
              const isCurrent = currentPlan === 'pro';
              return (
                <div className="relative">
                  {/* Floating ribbon — frames Pro as a supporter tier rather
                      than a fake "popular" claim. */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="popular-ribbon text-white text-[11px] md:text-[12px] font-extrabold uppercase tracking-[0.18em] px-4 py-1.5 rounded-full whitespace-nowrap">
                      ΣΤΗΡΙΞΗ
                    </div>
                  </div>

                  {/* Animated-border + breathing-glow card */}
                  <div className="pro-card rounded-2xl flex flex-col h-full">
                    <div className="p-7 md:p-8 pt-9 md:pt-10 bg-gradient-to-b from-[#FFF7ED] to-white rounded-t-[14px]">
                      <div
                        className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-5"
                        style={{
                          background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
                          boxShadow: '0 8px 20px rgba(249, 115, 22, 0.35), inset 0 1px 0 rgba(255,255,255,0.30)',
                        }}
                      >
                        <ProIcon size={24} className="text-white" strokeWidth={2.4} />
                      </div>
                      <h3 className="text-[24px] md:text-[26px] font-extrabold tracking-tight text-[#0A0A0A]">{pro.name}</h3>
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
                      <p className="text-[14px] md:text-[15px] mt-3 text-[#0A0A0A] font-medium">{pro.description}</p>
                    </div>

                    <div className="px-7 md:px-8 py-6 flex-1 space-y-3 border-t border-[#F97316]/10">
                      {pro.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-3">
                          {f.ok
                            ? (
                              <span className="w-5 h-5 rounded-full bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                                <Check size={13} className="text-[#10B981]" strokeWidth={3} />
                              </span>
                            )
                            : <X size={16} className="text-[#D1D5DB] flex-shrink-0" />}
                          <span className={cn('text-[14px]', f.ok ? 'text-[#0A0A0A] font-semibold' : 'text-[#9CA3AF]')}>
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="px-7 md:px-8 pb-7 md:pb-8">
                      {isCurrent ? (
                        <div className="w-full py-4 rounded-xl text-[14px] font-bold bg-[#10B981]/10 text-[#047857] flex items-center justify-center gap-2 ring-1 ring-inset ring-[#10B981]/20">
                          <Check size={16} strokeWidth={2.8} />
                          Είστε σε Pro
                        </div>
                      ) : (
                        <SubscribeButton
                          plan="pro"
                          className="shimmer-cta py-4 text-[14px] md:text-[15px] tracking-tight rounded-xl text-white shadow-orange-glow"
                          /* gradient bg lives in the className passed downstream — see SubscribeButton wrapper */
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Payment info */}
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
                  <p className="text-[12px] text-[#6B7280]">Προσθέστε κάρτα για να αναβαθμίσετε το πλάνο σας</p>
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
