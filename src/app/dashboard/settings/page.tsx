import { getMyRestaurant, getTablesForRestaurant } from '@/lib/supabase/server-queries';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const restaurant = await getMyRestaurant();
  const tables = restaurant ? await getTablesForRestaurant(restaurant.id) : [];

  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const userFullName = meta?.full_name || meta?.name || '';

  return (
    <SettingsForm
      restaurant={restaurant}
      tableCount={tables.length}
      tables={tables}
      userEmail={user?.email ?? ''}
      userFullName={userFullName}
    />
  );
}
