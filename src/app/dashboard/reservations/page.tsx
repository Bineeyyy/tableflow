import { TopBar } from '@/components/ui/topbar';
import { ReservationsClient } from '@/components/reservations/reservations-client';
import {
  getMyRestaurant,
  getTablesForRestaurant,
  getReservationsForRestaurant,
} from '@/lib/supabase/server-queries';
import { CalendarDays } from 'lucide-react';

export default async function ReservationsPage() {
  const restaurant = await getMyRestaurant();

  if (!restaurant) {
    return (
      <>
        <TopBar title="Κρατήσεις" subtitle="Διαχείριση κρατήσεων τραπεζιών" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <CalendarDays size={48} className="mx-auto text-stone-300" />
            <p className="text-stone-600 font-medium">Δεν έχετε δημιουργήσει εστιατόριο</p>
          </div>
        </div>
      </>
    );
  }

  const [tables, reservations] = await Promise.all([
    getTablesForRestaurant(restaurant.id),
    getReservationsForRestaurant(restaurant.id),
  ]);

  return (
    <>
      <TopBar title="Κρατήσεις" subtitle="Διαχείριση κρατήσεων τραπεζιών" />
      <ReservationsClient
        initialReservations={reservations}
        tables={tables}
        restaurantId={restaurant.id}
      />
    </>
  );
}
