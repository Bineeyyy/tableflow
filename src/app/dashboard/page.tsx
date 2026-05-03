import { TopBar } from '@/components/ui/topbar';
import { StatCard } from '@/components/ui/stat-card';
import { FloorPlan } from '@/components/floor-plan/floor-plan';
import { formatCurrency } from '@/lib/utils';
import {
  getMyRestaurant,
  getTablesForRestaurant,
  getReservationsForRestaurant,
  getOpenOrdersForRestaurant,
} from '@/lib/supabase/server-queries';
import { UtensilsCrossed, Users, TrendingUp, Clock } from 'lucide-react';

export default async function DashboardPage() {
  const restaurant = await getMyRestaurant();

  if (!restaurant) {
    return (
      <>
        <TopBar title="Κάτοψη Εστιατορίου" subtitle="Διαχείριση τραπεζιών σε πραγματικό χρόνο" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <UtensilsCrossed size={48} className="mx-auto text-stone-300" />
            <p className="text-stone-600 font-medium text-lg">Δεν έχετε δημιουργήσει εστιατόριο</p>
            <p className="text-stone-400 text-sm">Μεταβείτε στις Ρυθμίσεις για να προσθέσετε το εστιατόριό σας.</p>
          </div>
        </div>
      </>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const [tables, allReservations, openOrders] = await Promise.all([
    getTablesForRestaurant(restaurant.id),
    getReservationsForRestaurant(restaurant.id),
    getOpenOrdersForRestaurant(restaurant.id),
  ]);

  const todayReservations = allReservations.filter(r => r.date === today);

  const occupied  = tables.filter(t => t.status === 'occupied').length;
  const available = tables.filter(t => t.status === 'available').length;
  const reserved  = tables.filter(t => t.status === 'reserved').length;

  const totalGuests  = openOrders.reduce((sum, o) => sum + o.guests, 0);
  const totalRevenue = openOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const pendingReservations = todayReservations.filter(r => r.status === 'pending' || r.status === 'confirmed').length;

  return (
    <>
      <TopBar
        title="Κάτοψη Εστιατορίου"
        subtitle={restaurant.name}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Κατειλημμένα"
            value={`${occupied}/${tables.length}`}
            subtitle="τραπέζια σε χρήση"
            icon={UtensilsCrossed}
            iconColor="text-red-500"
          />
          <StatCard
            title="Διαθέσιμα"
            value={available}
            subtitle="τραπέζια ελεύθερα"
            icon={Clock}
            iconColor="text-emerald-500"
          />
          <StatCard
            title="Επισκέπτες"
            value={totalGuests}
            subtitle="άτομα αυτή τη στιγμή"
            icon={Users}
            iconColor="text-sky-500"
          />
          <StatCard
            title="Τζίρος Σήμερα"
            value={formatCurrency(totalRevenue)}
            subtitle={`${pendingReservations} κρατήσεις σήμερα`}
            icon={TrendingUp}
            iconColor="text-terracotta"
          />
        </div>

        {/* Floor Plan */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex-1" style={{ minHeight: '520px' }}>
          <FloorPlan
            initialTables={tables}
            restaurantId={restaurant.id}
            todayReservations={todayReservations}
          />
        </div>
      </div>
    </>
  );
}
