import { TopBar } from '@/components/ui/topbar';
import { StatCard } from '@/components/ui/stat-card';
import { FloorPlan } from '@/components/floor-plan/floor-plan';
import { MobileRedirect } from '@/components/ui/mobile-redirect';
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
            <UtensilsCrossed size={48} className="mx-auto text-[#D1D5DB]" />
            <p className="text-[#0A0A0A] font-bold text-lg tracking-tight">Δεν έχετε δημιουργήσει εστιατόριο</p>
            <p className="text-[#6B7280] text-sm">Μεταβείτε στις Ρυθμίσεις για να προσθέσετε το εστιατόριό σας.</p>
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

  const totalGuests  = openOrders.reduce((sum, o) => sum + o.guests, 0);
  const totalRevenue = openOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const pendingReservations = todayReservations.filter(r => r.status === 'pending' || r.status === 'confirmed').length;

  return (
    <>
      <MobileRedirect />
      <TopBar
        title="Κάτοψη Εστιατορίου"
        subtitle={restaurant.name}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <StatCard title="Κατειλημμένα" value={`${occupied}/${tables.length}`} subtitle="τραπέζια σε χρήση" icon={UtensilsCrossed} />
          <StatCard title="Διαθέσιμα" value={available} subtitle="τραπέζια ελεύθερα" icon={Clock} />
          <StatCard title="Επισκέπτες" value={totalGuests} subtitle="άτομα αυτή τη στιγμή" icon={Users} />
          <StatCard title="Τζίρος Σήμερα" value={formatCurrency(totalRevenue)} subtitle={`${pendingReservations} κρατήσεις σήμερα`} icon={TrendingUp} />
        </div>

        {/* Floor Plan */}
        <div className="bg-white rounded-lg p-4 border-2 border-[#F97316] shadow-card flex-1" style={{ minHeight: '520px' }}>
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
