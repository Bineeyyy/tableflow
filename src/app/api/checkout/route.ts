import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  // Validate env config first so a misconfigured deployment fails loudly
  // instead of silently dying inside the Stripe SDK.
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[checkout] STRIPE_SECRET_KEY is not set');
    return NextResponse.json(
      { error: 'Stripe δεν έχει ρυθμιστεί στον server (STRIPE_SECRET_KEY)' },
      { status: 500 },
    );
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error('[checkout] NEXT_PUBLIC_APP_URL is not set');
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_APP_URL δεν έχει ρυθμιστεί' },
      { status: 500 },
    );
  }

  let plan: string;
  try {
    const body = await request.json() as { plan?: string };
    plan = body.plan ?? 'pro';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const priceId = STRIPE_PRICES[plan];
  if (!priceId) {
    console.error('[checkout] Missing price id for plan', { plan, env: !!process.env.STRIPE_PRO_PRICE_ID });
    return NextResponse.json(
      { error: `Δεν έχει ρυθμιστεί τιμή για το πλάνο "${plan}". Ορίστε STRIPE_PRO_PRICE_ID στις μεταβλητές περιβάλλοντος.` },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: restaurant, error: restErr } = await supabase
    .from('restaurants')
    .select('id, plan, stripe_customer_id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (restErr) {
    console.error('[checkout] restaurant lookup failed:', restErr);
    return NextResponse.json({ error: 'Σφάλμα ανάγνωσης εστιατορίου' }, { status: 500 });
  }
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  if (restaurant.plan !== 'free') {
    return NextResponse.json({ error: 'Already on a paid plan' }, { status: 400 });
  }

  try {
    let customerId = restaurant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id, restaurant_id: restaurant.id },
      });
      customerId = customer.id;
      await supabase
        .from('restaurants')
        .update({ stripe_customer_id: customerId })
        .eq('id', restaurant.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { restaurant_id: restaurant.id },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=1`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
      subscription_data: {
        metadata: { restaurant_id: restaurant.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Stripe error';
    console.error('[checkout] Stripe call failed:', err);
    return NextResponse.json({ error: `Stripe σφάλμα: ${message}` }, { status: 500 });
  }
}
