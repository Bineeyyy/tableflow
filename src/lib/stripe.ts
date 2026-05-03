import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const STRIPE_PRICES: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID!,
};

export type SubscriptionStatus =
  | 'active' | 'trialing' | 'past_due' | 'cancelled'
  | 'incomplete' | 'incomplete_expired' | 'unpaid';

export function isAccessBlocked(status: string | null): boolean {
  return status === 'past_due' || status === 'cancelled';
}
