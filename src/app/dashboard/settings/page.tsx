import { getMyRestaurant, getTablesForRestaurant } from '@/lib/supabase/server-queries';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const restaurant = await getMyRestaurant();
  const tables = restaurant ? await getTablesForRestaurant(restaurant.id) : [];

  return (
    <SettingsForm
      restaurant={restaurant}
      tableCount={tables.length}
      userEmail={user?.email ?? ''}
    />
  );
}
