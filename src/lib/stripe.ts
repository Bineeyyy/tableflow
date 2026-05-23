import Stripe from 'stripe';

// Validate at module load. Without this, `new Stripe(undefined!)` constructs a
// broken client that only fails inside the SDK on first call, with a stack
// trace that points at Stripe internals instead of the actual misconfig. In
// production we throw and let the platform surface a clear boot error; in dev
// we log and continue so unrelated work isn't blocked when Stripe env vars
// aren't set locally.
function requireStripeEnv(name: string): string {
  const value = process.env[name];
  if (value) return value;
  const message = `${name} is not set. Configure it in the deploy environment.`;
  if (process.env.NODE_ENV === 'production') throw new Error(message);
  console.error(`[stripe] ${message} Stripe-dependent routes will fail at runtime.`);
  return '';
}

export const stripe = new Stripe(requireStripeEnv('STRIPE_SECRET_KEY'));

// Read the price IDs lazily so missing envs don't crash module load (and
// therefore `next build` page-data collection). Each consumer already
// handles the empty-string case with a 500 + clear error message.
export function getStripePrice(plan: string): string {
  if (plan === 'pro') return process.env.STRIPE_PRO_PRICE_ID ?? '';
  return '';
}

export type SubscriptionStatus =
  | 'active' | 'trialing' | 'canceling' | 'past_due' | 'cancelled'
  | 'incomplete' | 'incomplete_expired' | 'unpaid';

// Block any status that means the customer no longer has a valid paid
// subscription. 'canceling' is intentionally NOT blocked — the user clicked
// Cancel in the Stripe portal but still has paid access until the current
// period ends. 'incomplete' is also not blocked: it's transient (initial
// checkout still in flight) and Stripe will move it to active, past_due, or
// incomplete_expired within a few minutes.
//   - past_due: payment failed but Stripe is still retrying within dunning.
//   - cancelled: subscription terminated.
//   - incomplete_expired: the initial payment timed out without succeeding.
//   - unpaid: Stripe exhausted all retries and gave up — definitely blocked.
export function isAccessBlocked(status: string | null): boolean {
  return status === 'past_due'
    || status === 'cancelled'
    || status === 'incomplete_expired'
    || status === 'unpaid';
}

// Status values that mean the customer has a real paid subscription (or one
// that's still inside its in-Stripe trial window). When any of these holds,
// the in-app trial gate is irrelevant — the user is a paying customer.
export function hasPaidSubscription(status: string | null): boolean {
  return status === 'active'
    || status === 'trialing'
    || status === 'canceling';
}

// In-app trial gate. New restaurants are stamped with trial_ends_at = now()+7d
// on creation. Access stays open until that timestamp passes; after that, the
// only way back in is an active Stripe subscription.
export function isTrialActive(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

// Single source of truth for "can this restaurant use the dashboard right now?"
// Used by the proxy and the dashboard pages. Order matters: an active paid
// subscription always wins; otherwise we fall back to the trial timestamp.
export function isAccessAllowed(
  status: string | null,
  trialEndsAt: string | null,
): boolean {
  if (hasPaidSubscription(status)) return true;
  if (isAccessBlocked(status)) return false;
  return isTrialActive(trialEndsAt);
}
