import {
  getMyRestaurant,
  getTablesForRestaurant,
  getReservationsForRestaurant,
} from '@/lib/supabase/server-queries';
import { createClient } from '@/lib/supabase/server';
import { WaiterApp } from './waiter-app';
import { redirect } from 'next/navigation';

export default async function WaiterPage() {
  const restaurant = await getMyRestaurant();
  if (!restaurant) redirect('/onboarding');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];
  const [tables, reservations] = await Promise.all([
    getTablesForRestaurant(restaurant.id),
    getReservationsForRestaurant(restaurant.id),
  ]);

  const todayReservations = reservations.filter(r => r.date === today);

  const isOwner = !!(user && user.id === restaurant.owner_id);

  return (
    <WaiterApp
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      initialTables={tables}
      initialReservations={todayReservations}
      userEmail={user?.email ?? ''}
      isOwner={isOwner}
    />
  );
}
