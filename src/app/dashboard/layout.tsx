import { Sidebar } from '@/components/ui/sidebar';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { MobileNavProvider } from '@/lib/mobile-nav-context';
import { getMyRestaurant, getTodayActiveReservationCount } from '@/lib/supabase/server-queries';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const restaurant = await getMyRestaurant();
  const reservationsBadge = restaurant
    ? await getTodayActiveReservationCount(restaurant.id)
    : 0;

  return (
    <MobileNavProvider>
      <div className="flex h-screen w-screen max-w-[100vw] overflow-hidden pb-16 md:pb-0" style={{ background: '#F8F8F8' }}>
        <Sidebar reservationsBadge={reservationsBadge} />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 max-w-full">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </MobileNavProvider>
  );
}
