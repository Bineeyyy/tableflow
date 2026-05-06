import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// Webhooks must not be cached and need raw body for signature verification
export const dynamic = 'force-dynamic';

const log = (event: string, data: Record<string, unknown> = {}) =>
  console.log(`[stripe webhook] ${event}`, JSON.stringify(data));

const warn = (event: string, data: Record<string, unknown> = {}) =>
  console.warn(`[stripe webhook] ${event}`, JSON.stringify(data));

const err = (event: string, data: Record<string, unknown> = {}) =>
  console.error(`[stripe webhook] ${event}`, JSON.stringify(data));

// Translate a Stripe subscription into the value we store in
// `restaurants.subscription_status`. Two non-pass-through cases:
//   - active/trialing + cancel_at_period_end=true → 'canceling' (the user
//     clicked Cancel in the billing portal but still has paid access until
//     the current period ends; we'll flip to 'cancelled' when
//     customer.subscription.deleted fires).
//   - Stripe spells it 'canceled' (US); the rest of this codebase uses
//     'cancelled' (UK). Normalise here so the DB stays consistent.
function mapSubscriptionStatus(sub: Stripe.Subscription): string {
  if (sub.cancel_at_period_end && (sub.status === 'active' || sub.status === 'trialing')) {
    return 'canceling';
  }
  if (sub.status === 'canceled') return 'cancelled';
  return sub.status;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    err('missing_signature_header');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    err('missing_webhook_secret_env');
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not configured on the server' },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (e) {
    // Most common cause of a signature failure here is a test/live mismatch:
    // the live mode webhook signing secret is set in the env but Stripe sent
    // a test mode event (or vice versa). Make that obvious in the logs.
    err('signature_verification_failed', {
      message: e instanceof Error ? e.message : String(e),
      hint: 'Most likely a test/live mismatch between STRIPE_WEBHOOK_SECRET in Vercel and the Stripe Dashboard endpoint that fired this event. Verify the secret matches the endpoint mode (test vs live).',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  log('event_received', {
    id: event.id,
    type: event.type,
    livemode: event.livemode,
    api_version: event.api_version,
  });

  const db = createAdminClient();

  try {
    switch (event.type) {
      // ── New subscription paid ──────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const restaurantId = session.metadata?.restaurant_id;

        if (!restaurantId) {
          warn('checkout_completed_missing_restaurant_id', {
            session_id: session.id,
            metadata: session.metadata,
          });
          break;
        }
        if (session.mode !== 'subscription') {
          log('checkout_completed_skipped_non_subscription', {
            session_id: session.id,
            mode: session.mode,
          });
          break;
        }

        const { data, error: dbErr } = await db
          .from('restaurants')
          .update({
            plan: 'pro',
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
          })
          .eq('id', restaurantId)
          .select('id');

        if (dbErr) {
          err('checkout_update_failed', {
            restaurant_id: restaurantId,
            db_error: dbErr.message,
            code: dbErr.code,
            details: dbErr.details,
          });
          throw dbErr;
        }
        if (!data || data.length === 0) {
          warn('checkout_update_no_rows', {
            restaurant_id: restaurantId,
            hint: 'No restaurant matched this id — was it deleted, or is the metadata wrong?',
          });
        } else {
          log('checkout_update_ok', { restaurant_id: restaurantId, rows: data.length });
        }
        break;
      }

      // ── Recurring invoice paid — keep subscription active ─────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string }).subscription;

        if (!subId) {
          log('invoice_paid_no_subscription', { invoice_id: invoice.id });
          break;
        }

        const { data, error: dbErr } = await db
          .from('restaurants')
          .update({ subscription_status: 'active' })
          .eq('stripe_subscription_id', subId)
          .select('id');

        if (dbErr) {
          err('invoice_paid_update_failed', {
            stripe_subscription_id: subId,
            db_error: dbErr.message,
            code: dbErr.code,
            details: dbErr.details,
          });
          throw dbErr;
        }
        if (!data || data.length === 0) {
          warn('invoice_paid_no_rows', {
            stripe_subscription_id: subId,
            hint: 'No restaurant has this stripe_subscription_id stored — checkout.session.completed may not have persisted it yet.',
          });
        } else {
          log('invoice_paid_update_ok', { stripe_subscription_id: subId, rows: data.length });
        }
        break;
      }

      // ── Payment failed — mark past_due ────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string }).subscription;
        if (!subId) {
          log('invoice_failed_no_subscription', { invoice_id: invoice.id });
          break;
        }

        const { data, error: dbErr } = await db
          .from('restaurants')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', subId)
          .select('id');

        if (dbErr) {
          err('invoice_failed_update_failed', { stripe_subscription_id: subId, db_error: dbErr.message });
          throw dbErr;
        }
        log('invoice_failed_update_ok', { stripe_subscription_id: subId, rows: data?.length ?? 0 });
        break;
      }

      // ── Subscription state change (cancel-at-period-end, reactivation,
      //    plan change, status transitions) ──────────────────────────────────
      // Fires when the user toggles cancel-at-period-end in the Stripe portal,
      // when payment recovers from past_due, when Stripe pauses/unpauses, etc.
      // We mirror the latest state into subscription_status; the `plan` column
      // is intentionally untouched here — Pro access continues until the
      // period actually ends and customer.subscription.deleted fires.
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = mapSubscriptionStatus(subscription);

        const { data, error: dbErr } = await db
          .from('restaurants')
          .update({ subscription_status: status })
          .eq('stripe_subscription_id', subscription.id)
          .select('id');

        if (dbErr) {
          err('subscription_updated_update_failed', {
            subscription_id: subscription.id,
            stripe_status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            computed_status: status,
            db_error: dbErr.message,
          });
          throw dbErr;
        }
        if (!data || data.length === 0) {
          warn('subscription_updated_no_rows', {
            subscription_id: subscription.id,
            stripe_status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            computed_status: status,
            hint: 'No restaurant has this stripe_subscription_id stored — checkout.session.completed may not have persisted it yet.',
          });
        } else {
          log('subscription_updated_update_ok', {
            subscription_id: subscription.id,
            stripe_status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: subscription.cancel_at,
            computed_status: status,
            rows: data.length,
          });
        }
        break;
      }

      // ── Subscription cancelled / ended ────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { data, error: dbErr } = await db
          .from('restaurants')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
            subscription_status: 'cancelled',
          })
          .eq('stripe_subscription_id', subscription.id)
          .select('id');

        if (dbErr) {
          err('subscription_deleted_update_failed', {
            subscription_id: subscription.id,
            db_error: dbErr.message,
          });
          throw dbErr;
        }
        log('subscription_deleted_update_ok', {
          subscription_id: subscription.id,
          rows: data?.length ?? 0,
        });
        break;
      }

      default:
        log('event_unhandled', { type: event.type, id: event.id });
    }
  } catch (e) {
    err('handler_exception', {
      event_id: event.id,
      type: event.type,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
