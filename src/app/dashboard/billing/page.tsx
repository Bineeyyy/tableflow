import { TopBar } from '@/components/ui/topbar';
import { SubscribeButton } from '@/components/billing/subscribe-button';
import { PortalButton } from '@/components/billing/portal-button';
import { getMyRestaurant } from '@/lib/supabase/server-queries';
import { stripe } from '@/lib/stripe';
import {
  Check, X, Zap, Building2, Star,
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

const PLAN_META = {
  free: {
    name: 'Δωρεάν',
    price: '0€',
    period: '/μήνα',
    description: 'Ιδανικό για μικρά εστιατόρια που ξεκινούν',
    Icon: Star,
    color: 'border-stone-200',
    headerBg: 'bg-stone-50',
    headerText: 'text-stone-800',
    subText: 'text-stone-500',
    iconBg: 'bg-stone-200 text-stone-600',
    features: [
      { label: 'Έως 10 τραπέζια', ok: true },
      { label: 'Βασική κάτοψη', ok: true },
      { label: '1 χρήστης', ok: true },
      { label: 'Παραγγελίες & Μενού', ok: true },
      { label: 'Κρατήσεις', ok: false },
      { label: 'Αναφορές & στατιστικά', ok: false },
      { label: 'Ειδοποιήσεις SMS', ok: false },
      { label: 'Εξαγωγή δεδομένων', ok: false },
    ],
  },
  pro: {
    name: 'Pro',
    price: '29€',
    period: '/μήνα',
    description: 'Για επαγγελματίες που θέλουν όλες τις δυνατότητες',
    Icon: Zap,
    color: 'border-terracotta shadow-lg shadow-terracotta/10',
    headerBg: 'bg-gradient-to-br from-terracotta to-terracotta-dark',
    headerText: 'text-white',
    subText: 'text-white/70',
    iconBg: 'bg-white/20 text-white',
    badge: 'Δημοφιλές',
    features: [
      { label: 'Απεριόριστα τραπέζια', ok: true },
      { label: 'Πλήρης κάτοψη & ζώνες', ok: true },
      { label: 'Έως 5 χρήστες', ok: true },
      { label: 'Παραγγελίες & Μενού', ok: true },
      { label: 'Κρατήσεις online', ok: true },
      { label: 'Αναφορές & στατιστικά', ok: true },
      { label: 'Ειδοποιήσεις SMS', ok: true },
      { label: 'Εξαγωγή δεδομένων', ok: false },
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: '79€',
    period: '/μήνα',
    description: 'Για αλυσίδες και μεγάλες επιχειρήσεις εστίασης',
    Icon: Building2,
    color: 'border-stone-300',
    headerBg: 'bg-stone-900',
    headerText: 'text-white',
    subText: 'text-white/70',
    iconBg: 'bg-white/20 text-white',
    features: [
      { label: 'Απεριόριστα τραπέζια', ok: true },
      { label: 'Πολλαπλά εστιατόρια', ok: true },
      { label: 'Απεριόριστοι χρήστες', ok: true },
      { label: 'Παραγγελίες & Μενού', ok: true },
      { label: 'Κρατήσεις + API', ok: true },
      { label: 'Αναφορές & dashboard', ok: true },
      { label: 'Ειδοποιήσεις SMS & email', ok: true },
      { label: 'White-label & προσαρμογή', ok: true },
    ],
  },
};

function StatusBanner({
  plan,
  status,
  hasCustomer,
}: {
  plan: string;
  status: string | null;
  hasCustomer: boolean;
}) {
  if (status === 'past_due') {
    return (
      <div className="flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl">
        <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-red-800">Η πληρωμή απέτυχε</p>
          <p className="text-sm text-red-600 mt-0.5">
            Η τελευταία χρέωση δεν πραγματοποιήθηκε. Ενημερώστε την κάρτα σας για να διατηρήσετε πρόσβαση.
          </p>
        </div>
        {hasCustomer && (
          <PortalButton className="text-red-600 hover:text-red-800 whitespace-nowrap" />
        )}
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-amber-800">Η συνδρομή σας έληξε</p>
          <p className="text-sm text-amber-600 mt-0.5">
            Ο λογαριασμός σας μεταφέρθηκε στο δωρεάν πλάνο. Αναβαθμίστε για να ανακτήσετε πρόσβαση σε Pro λειτουργίες.
          </p>
        </div>
      </div>
    );
  }

  if (plan === 'pro' && (status === 'active' || status === 'trialing')) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
        <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-emerald-800">
            Συνδρομή Pro {status === 'trialing' ? '(Δοκιμαστική)' : 'ενεργή'}
          </p>
          <p className="text-sm text-emerald-600 mt-0.5">Έχετε πρόσβαση σε όλες τις Pro λειτουργίες.</p>
        </div>
        {hasCustomer && (
          <PortalButton className="text-emerald-700 hover:text-emerald-900" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-white border border-stone-100 rounded-2xl shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
        <Shield size={18} className="text-stone-500" />
      </div>
      <div>
        <p className="font-semibold text-stone-800">
          Τρέχον Πλάνο: <span className="text-terracotta capitalize">{plan}</span>
        </p>
        <p className="text-sm text-stone-500">Αναβαθμίστε για περισσότερες δυνατότητες</p>
      </div>
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const restaurant = await getMyRestaurant();
  const currentPlan = restaurant?.plan ?? 'free';
  const subStatus = restaurant?.subscription_status ?? null;
  const hasCustomer = !!restaurant?.stripe_customer_id;
  const { success } = await searchParams;
  const proPrice = await getProPriceLabel();

  return (
    <>
      <TopBar title="Συνδρομή" subtitle="Διαχείριση πλάνου & χρεώσεων" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Post-checkout success notice */}
        {success === '1' && (
          <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <p className="text-emerald-800 font-medium">
              Η πληρωμή ολοκληρώθηκε! Η συνδρομή σας θα ενεργοποιηθεί σε λίγα δευτερόλεπτα.
            </p>
          </div>
        )}

        {/* Status banner */}
        <StatusBanner plan={currentPlan} status={subStatus} hasCustomer={hasCustomer} />

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(PLAN_META) as [string, typeof PLAN_META.free & { badge?: string }][]).map(([key, meta]) => {
            const isCurrent = currentPlan === key;
            const { Icon } = meta;

            return (
              <div
                key={key}
                className={cn(
                  'relative bg-white rounded-2xl border-2 overflow-hidden flex flex-col',
                  meta.color,
                  isCurrent && 'ring-2 ring-terracotta/30',
                )}
              >
                {'badge' in meta && meta.badge && (
                  <div className="absolute top-4 right-4 bg-terracotta text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {meta.badge}
                  </div>
                )}

                <div className={cn('p-6', meta.headerBg)}>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', meta.iconBg)}>
                    <Icon size={20} />
                  </div>
                  <h3 className={cn('text-xl font-bold', meta.headerText)}>{meta.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={cn('text-4xl font-extrabold', meta.headerText)}>
                      {key === 'pro' ? proPrice.amount : meta.price}
                    </span>
                    <span className={cn('text-sm', meta.subText)}>
                      {key === 'pro' ? proPrice.interval : meta.period}
                    </span>
                  </div>
                  <p className={cn('text-sm mt-2', meta.subText)}>{meta.description}</p>
                </div>

                <div className="p-6 flex-1 space-y-3">
                  {meta.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {f.ok
                        ? <Check size={16} className="text-emerald-500 flex-shrink-0" />
                        : <X size={16} className="text-stone-300 flex-shrink-0" />}
                      <span className={cn('text-sm', f.ok ? 'text-stone-700' : 'text-stone-400')}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-6 pb-6">
                  {isCurrent ? (
                    <div className="w-full py-3 rounded-xl text-sm font-semibold bg-stone-100 text-stone-500 flex items-center justify-center gap-2">
                      <Check size={15} />
                      Τρέχον Πλάνο
                    </div>
                  ) : key === 'pro' && currentPlan === 'free' ? (
                    <SubscribeButton
                      plan="pro"
                      className="bg-terracotta hover:bg-terracotta-dark text-white shadow-sm shadow-terracotta/30"
                    />
                  ) : key === 'enterprise' ? (
                    <button className="w-full py-3 rounded-xl text-sm font-semibold bg-stone-900 hover:bg-stone-800 text-white transition-all active:scale-95">
                      Επικοινωνήστε μαζί μας
                    </button>
                  ) : (
                    <div className="w-full py-3 rounded-xl text-sm font-semibold bg-stone-100 text-stone-400 flex items-center justify-center">
                      Μη διαθέσιμο
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment info */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard size={18} className="text-stone-500" />
            <h3 className="font-semibold text-stone-800">Στοιχεία Πληρωμής</h3>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-8 bg-stone-200 rounded-md flex items-center justify-center">
              <span className="text-xs font-bold text-stone-500">VISA</span>
            </div>
            <div className="flex-1">
              {hasCustomer ? (
                <>
                  <p className="text-sm font-medium text-stone-700">Διαχειριστείτε τα στοιχεία πληρωμής σας</p>
                  <p className="text-xs text-stone-400">Ακύρωση, αλλαγή κάρτας ή προβολή ιστορικού χρεώσεων</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-stone-700">Δεν έχει προστεθεί κάρτα πληρωμής</p>
                  <p className="text-xs text-stone-400">Προσθέστε κάρτα για να αναβαθμίσετε το πλάνο σας</p>
                </>
              )}
            </div>
            {hasCustomer && (
              <PortalButton className="text-terracotta hover:text-terracotta-dark" />
            )}
          </div>
          <p className="text-xs text-stone-400 mt-3 flex items-center gap-1.5">
            <Shield size={12} />
            Ασφαλείς συναλλαγές μέσω Stripe. Ακύρωση οποτεδήποτε.
          </p>
        </div>

      </div>
    </>
  );
}
