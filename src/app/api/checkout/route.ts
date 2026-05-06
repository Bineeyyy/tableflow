import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import { isSameOrigin } from '@/lib/http/same-origin';

const RESTAURANT_COOKIE = 'tf_restaurant_id';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  // Honour the pinned restaurant from the cookie so multi-restaurant owners
  // can subscribe whichever one they're currently viewing. The cookie is
  // verified against owner_id — if it points at a restaurant they no longer
  // own (transferred, deleted, switched accounts), we fall back to the
  // oldest-owned restaurant. RLS would also reject a foreign id, but the
  // explicit owner_id check returns a clean error instead of a generic 404.
  const cookieStore = await cookies();
  const pinnedId = cookieStore.get(RESTAURANT_COOKIE)?.value;

  let restaurant: { id: string; plan: string | null; stripe_customer_id: string | null } | null = null;
  let restErr: { message?: string } | null = null;

  if (pinnedId) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, plan, stripe_customer_id')
      .eq('id', pinnedId)
      .eq('owner_id', user.id)
      .maybeSingle();
    restaurant = data;
    restErr = error;
  }

  if (!restaurant && !restErr) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, plan, stripe_customer_id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    restaurant = data;
    restErr = error;
  }

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
