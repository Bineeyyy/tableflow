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
    color: 'border-[#E5E7EB]',
    headerBg: 'bg-[#F8F8F8]',
    headerText: 'text-[#0A0A0A]',
    subText: 'text-[#6B7280]',
    iconBg: 'bg-[#E5E7EB] text-[#6B7280]',
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
    color: 'border-[#F97316]',
    headerBg: 'bg-[#0A0A0A]',
    headerText: 'text-white',
    subText: 'text-white/60',
    iconBg: 'bg-[#F97316] text-white',
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
    color: 'border-[#E5E7EB]',
    headerBg: 'bg-white',
    headerText: 'text-[#0A0A0A]',
    subText: 'text-[#6B7280]',
    iconBg: 'bg-[#0A0A0A] text-white',
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

  if (plan === 'pro' && (status === 'active' || status === 'trialing')) {
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
                  'relative bg-white rounded-lg border-2 overflow-hidden flex flex-col shadow-card',
                  meta.color,
                  isCurrent && 'ring-2 ring-[#F97316]/30',
                )}
              >
                {'badge' in meta && meta.badge && (
                  <div className="absolute top-4 right-4 bg-[#F97316] text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
                    {meta.badge}
                  </div>
                )}

                <div className={cn('p-6', meta.headerBg)}>
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-4', meta.iconBg)}>
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <h3 className={cn('text-xl font-bold tracking-tight', meta.headerText)}>{meta.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={cn('text-[40px] font-extrabold tracking-tight leading-none', meta.headerText)}>
                      {key === 'pro' ? proPrice.amount : meta.price}
                    </span>
                    <span className={cn('text-[13px] font-medium', meta.subText)}>
                      {key === 'pro' ? proPrice.interval : meta.period}
                    </span>
                  </div>
                  <p className={cn('text-[13px] mt-3', meta.subText)}>{meta.description}</p>
                </div>

                <div className="p-6 flex-1 space-y-3 border-t border-[#E5E7EB]">
                  {meta.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {f.ok
                        ? <Check size={16} className="text-[#10B981] flex-shrink-0" strokeWidth={2.6} />
                        : <X size={16} className="text-[#D1D5DB] flex-shrink-0" />}
                      <span className={cn('text-[13px]', f.ok ? 'text-[#0A0A0A] font-medium' : 'text-[#9CA3AF]')}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-6 pb-6">
                  {isCurrent ? (
                    <div className="w-full py-3 rounded-lg text-[13px] font-bold bg-[#F8F8F8] text-[#6B7280] flex items-center justify-center gap-2 border border-[#E5E7EB]">
                      <Check size={15} strokeWidth={2.6} />
                      Τρέχον Πλάνο
                    </div>
                  ) : key === 'pro' && currentPlan === 'free' ? (
                    <SubscribeButton
                      plan="pro"
                      className="bg-[#F97316] hover:bg-[#EA580C] text-white"
                    />
                  ) : key === 'enterprise' ? (
                    <button className="w-full py-3 rounded-lg text-[13px] font-bold bg-[#0A0A0A] hover:bg-black text-white transition-all active:scale-[0.98]">
                      Επικοινωνήστε μαζί μας
                    </button>
                  ) : (
                    <div className="w-full py-3 rounded-lg text-[13px] font-semibold bg-[#F8F8F8] text-[#9CA3AF] flex items-center justify-center border border-[#E5E7EB]">
                      Μη διαθέσιμο
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
