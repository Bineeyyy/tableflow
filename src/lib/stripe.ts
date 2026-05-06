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

export const STRIPE_PRICES: Record<string, string> = {
  pro: requireStripeEnv('STRIPE_PRO_PRICE_ID'),
};

export type SubscriptionStatus =
  | 'active' | 'trialing' | 'canceling' | 'past_due' | 'cancelled'
  | 'incomplete' | 'incomplete_expired' | 'unpaid';

// 'canceling' is intentionally NOT blocked — the user clicked Cancel in the
// Stripe portal but still has paid access until the current period ends.
export function isAccessBlocked(status: string | null): boolean {
  return status === 'past_due' || status === 'cancelled';
}
