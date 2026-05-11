import { Sidebar } from '@/components/ui/sidebar';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { MobileNavProvider } from '@/lib/mobile-nav-context';
import { getMyRestaurant, getTodayActiveReservationCount } from '@/lib/supabase/server-queries';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ data: { user } }, restaurant] = await Promise.all([
    supabase.auth.getUser(),
    getMyRestaurant(),
  ]);

  const reservationsBadge = restaurant
    ? await getTodayActiveReservationCount(restaurant.id)
    : 0;

  // Prefer the auth user's display name from metadata; fall back to email.
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const userLabel = meta?.full_name || meta?.name || user?.email || undefined;
  const isOwner = !!(user && restaurant && user.id === restaurant.owner_id);

  return (
    <MobileNavProvider>
      <div className="flex h-screen w-screen max-w-[100vw] overflow-hidden pb-16 md:pb-0" style={{ background: '#FAF6EE' }}>
        <Sidebar
          reservationsBadge={reservationsBadge}
          restaurantName={restaurant?.name}
          userLabel={userLabel}
          userRole={isOwner ? 'Ιδιοκτήτης' : restaurant ? 'Μέλος' : undefined}
        />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 max-w-full">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </MobileNavProvider>
  );
}
