import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await request.json() as { plan: string };
  const priceId = STRIPE_PRICES[plan];
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, plan, stripe_customer_id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  if (restaurant.plan !== 'free') {
    return NextResponse.json({ error: 'Already on a paid plan' }, { status: 400 });
  }

  // Create Stripe customer on first checkout
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
}
