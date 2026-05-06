import { redirect } from 'next/navigation';
import {
  getMyRestaurant,
  getTablesForRestaurant,
  getReservationsForRestaurant,
} from '@/lib/supabase/server-queries';
import { PrintView } from './print-view';

// Standalone page (no dashboard chrome) so window.print() captures only the
// reservation table. The route lives under /dashboard so the proxy guards
// (auth + restaurant cookie) still apply — anonymous users can't print
// someone else's reservation list by guessing the URL.
export default async function ReservationsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const restaurant = await getMyRestaurant();
  if (!restaurant) redirect('/dashboard/reservations');

  // Default to today in the server's locale. The form passes ?date=YYYY-MM-DD
  // explicitly when printing tomorrow / a specific day, so we don't have to
  // worry about timezone drift between server and client here.
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const [tables, reservations] = await Promise.all([
    getTablesForRestaurant(restaurant.id),
    getReservationsForRestaurant(restaurant.id),
  ]);

  // Live reservations only — cancelled/completed clutter the printed sheet
  // and nobody reads them at the host stand. Sort by time so the printed
  // page matches the on-screen list order.
  const filtered = reservations
    .filter(r => r.date === targetDate)
    .filter(r => r.status !== 'cancelled' && r.status !== 'completed')
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <PrintView
      restaurantName={restaurant.name}
      date={targetDate}
      reservations={filtered}
      tables={tables}
    />
  );
}
