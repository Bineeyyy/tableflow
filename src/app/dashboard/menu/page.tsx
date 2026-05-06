import { TopBar } from '@/components/ui/topbar';
import { UtensilsCrossed } from 'lucide-react';
import {
  getMyRestaurant,
  getMenuCategoriesForRestaurant,
  getMenuItemsForRestaurant,
} from '@/lib/supabase/server-queries';
import { ensureMenuCategories } from '@/app/actions/menu';
import { MenuClient, type MenuCategoryRow, type MenuItemRow } from './menu-client';

export default async function MenuPage() {
  const restaurant = await getMyRestaurant();

  if (!restaurant) {
    return (
      <>
        <TopBar title="Μενού" subtitle="Διαχείριση καταλόγου εστιατορίου" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <UtensilsCrossed size={48} className="mx-auto text-[#D1D5DB]" />
            <p className="text-[#0A0A0A] font-bold tracking-tight">Δεν έχετε δημιουργήσει εστιατόριο</p>
          </div>
        </div>
      </>
    );
  }

  // Lazy-seed the five canonical categories the first time a user opens the
  // menu — covers restaurants that were created before menu CRUD shipped.
  await ensureMenuCategories(restaurant.id);

  const [categories, items] = await Promise.all([
    getMenuCategoriesForRestaurant(restaurant.id),
    getMenuItemsForRestaurant(restaurant.id),
  ]);

  // Map category_id → slug so the client can group items by stable enum value
  // even if the category row is renamed.
  const slugById = new Map(categories.map(c => [c.id, c.slug]));
  const itemRows: MenuItemRow[] = items
    .filter(i => i.category_id && slugById.has(i.category_id))
    .map(i => ({
      id: i.id,
      name: i.name,
      description: i.description ?? '',
      price: i.price,
      available: i.available,
      slug: slugById.get(i.category_id!)!,
    }));

  const categoryRows: MenuCategoryRow[] = categories.map(c => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
  }));

  return (
    <>
      <TopBar title="Μενού" subtitle="Διαχείριση καταλόγου εστιατορίου" />
      <MenuClient initialItems={itemRows} categories={categoryRows} />
    </>
  );
}
