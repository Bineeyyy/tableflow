import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// Webhooks must not be cached and need raw body for signature verification
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    switch (event.type) {
      // ── New subscription paid ──────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const restaurantId = session.metadata?.restaurant_id;
        if (!restaurantId || session.mode !== 'subscription') break;

        await db.from('restaurants').update({
          plan: 'pro',
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
        }).eq('id', restaurantId);
        break;
      }

      // ── Recurring invoice paid — keep subscription active ─────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string }).subscription;
        if (!subId) break;

        await db.from('restaurants').update({
          subscription_status: 'active',
        }).eq('stripe_subscription_id', subId);
        break;
      }

      // ── Payment failed — mark past_due ────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string }).subscription;
        if (!subId) break;

        await db.from('restaurants').update({
          subscription_status: 'past_due',
        }).eq('stripe_subscription_id', subId);
        break;
      }

      // ── Subscription cancelled / ended ────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await db.from('restaurants').update({
          plan: 'free',
          stripe_subscription_id: null,
          subscription_status: 'cancelled',
        }).eq('stripe_subscription_id', subscription.id);
        break;
      }
    }
  } catch (err) {
    console.error('[stripe webhook] handler error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
