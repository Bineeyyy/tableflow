'use client';

import { useRef, useState, useTransition } from 'react';
import { Modal } from '@/components/ui/modal';
import { UndoToast } from '@/components/ui/undo-toast';
import { useUndoAction } from '@/hooks/use-undo-action';
import { formatCurrency, cn } from '@/lib/utils';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, UtensilsCrossed, Search } from 'lucide-react';
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  setMenuItemAvailable,
} from '@/app/actions/menu';
import type { Database } from '@/types/database.types';

type CategorySlug = Database['public']['Enums']['menu_category_slug'];

export type MenuCategoryRow = {
  id: string;
  slug: CategorySlug;
  name: string;
};

export type MenuItemRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  slug: CategorySlug;
};

const ALL_TAB = 'all' as const;
type CategoryFilter = CategorySlug | typeof ALL_TAB;

const emptyForm = {
  name: '',
  slug: 'mains' as CategorySlug,
  description: '',
  price: '',
  available: true,
};

interface Props {
  initialItems: MenuItemRow[];
  categories: MenuCategoryRow[];
}

export function MenuClient({ initialItems, categories }: Props) {
  const [items, setItems] = useState<MenuItemRow[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>(ALL_TAB);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItemRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  // Synchronous re-entry guard. disabled={saving} alone leaves a window
  // between the click handler and React re-render where an Enter-key
  // resubmit can fire a second action.
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Defer destructive deletes by 5s with an undo toast — easier than building
  // a full trash + restore flow when a misclick is the dominant failure mode.
  const undoAction = useUndoAction(5000);

  const labelBySlug = new Map(categories.map(c => [c.slug, c.name]));

  const filtered = items.filter(item => {
    const matchCat = activeCategory === ALL_TAB || item.slug === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const tabs: { key: CategoryFilter; label: string }[] = [
    { key: ALL_TAB, label: 'Όλα' },
    ...categories.map(c => ({ key: c.slug as CategoryFilter, label: c.name })),
  ];

  const toggleAvailable = (id: string) => {
    const next = items.map(i => i.id === id ? { ...i, available: !i.available } : i);
    setItems(next);
    const target = next.find(i => i.id === id);
    if (!target) return;
    startTransition(async () => {
      const res = await setMenuItemAvailable(id, target.available);
      if (res.error) {
        // Roll back on failure.
        setItems(prev => prev.map(i => i.id === id ? { ...i, available: !target.available } : i));
        console.error('Failed to toggle availability:', res.error);
      }
    });
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (item: MenuItemRow) => {
    setEditItem(item);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description,
      price: String(item.price),
      available: item.available,
    });
    setError(null);
    setShowModal(true);
  };

  const saveItem = async () => {
    if (savingRef.current) return;
    if (!form.name.trim() || !form.price) return;
    const price = parseFloat(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setError('Μη έγκυρη τιμή');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      price,
      available: form.available,
    };

    try {
      if (editItem) {
        const res = await updateMenuItem(editItem.id, payload);
        if (res.error || !res.item) {
          setError(res.error ?? 'Αποτυχία αποθήκευσης');
          return;
        }
        const slug = categories.find(c => c.id === res.item!.category_id)?.slug ?? form.slug;
        setItems(prev => prev.map(i => i.id === editItem.id ? {
          id: res.item!.id,
          name: res.item!.name,
          description: res.item!.description ?? '',
          price: res.item!.price,
          available: res.item!.available,
          slug,
        } : i));
      } else {
        const res = await createMenuItem(payload);
        if (res.error || !res.item) {
          setError(res.error ?? 'Αποτυχία προσθήκης');
          return;
        }
        const slug = categories.find(c => c.id === res.item!.category_id)?.slug ?? form.slug;
        setItems(prev => [...prev, {
          id: res.item!.id,
          name: res.item!.name,
          description: res.item!.description ?? '',
          price: res.item!.price,
          available: res.item!.available,
          slug,
        }]);
      }
      setShowModal(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const deleteRow = (id: string) => {
    const target = items.find(i => i.id === id);
    if (!target) return;
    const snapshot = items;
    setItems(snapshot.filter(i => i.id !== id));
    undoAction.run({
      id: `del-${id}`,
      label: `Διαγράφηκε: ${target.name}`,
      revert: () => setItems(snapshot),
      commit: async () => {
        const res = await deleteMenuItem(id);
        if (res.error) {
          console.error('Failed to delete:', res.error);
          setItems(snapshot);
        }
      },
    });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-5">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Αναζήτηση πιάτου..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 w-64"
            />
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg transition-colors active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.6} />
            Προσθήκη Πιάτου
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(cat => {
            const count = cat.key === ALL_TAB
              ? items.length
              : items.filter(i => i.slug === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all',
                  activeCategory === cat.key
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white text-[#0A0A0A] hover:bg-[#F8F8F8] border border-[#E5E7EB]',
                )}
              >
                <span>{cat.label}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-bold tabular-nums',
                  activeCategory === cat.key ? 'bg-white/20 text-white' : 'bg-[#F8F8F8] text-[#6B7280]',
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Items grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E5E7EB] py-16 text-center">
            <UtensilsCrossed size={40} className="mx-auto text-[#D1D5DB] mb-3" />
            <p className="text-[#6B7280] text-[13px]">
              {items.length === 0 ? 'Δεν έχετε προσθέσει πιάτα. Πατήστε "Προσθήκη Πιάτου".' : 'Δεν βρέθηκαν πιάτα'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div key={item.id} className={cn('bg-white rounded-lg border border-[#0A0A0A] p-5 shadow-card hover:shadow-card-hover transition-all', !item.available && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] bg-[#F8F8F8] text-[#6B7280] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-[#E5E7EB]">
                        {labelBySlug.get(item.slug) ?? item.slug}
                      </span>
                      {!item.available && (
                        <span className="text-[10px] bg-[#EF4444]/10 text-[#B91C1C] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Μη διαθέσιμο</span>
                      )}
                    </div>
                    <h4 className="font-bold text-[#0A0A0A] tracking-tight truncate">{item.name}</h4>
                    {item.description && <p className="text-[12px] text-[#6B7280] mt-1 line-clamp-2">{item.description}</p>}
                  </div>
                  <div className="text-[20px] font-extrabold text-[#0A0A0A] tracking-tight flex-shrink-0 tabular-nums">{formatCurrency(item.price)}</div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E5E7EB]">
                  <button
                    onClick={() => toggleAvailable(item.id)}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
                  >
                    {item.available
                      ? <ToggleRight size={20} className="text-[#10B981]" />
                      : <ToggleLeft size={20} className="text-[#D1D5DB]" />}
                    {item.available ? 'Διαθέσιμο' : 'Μη διαθέσιμο'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => deleteRow(item.id)} className="p-1.5 rounded-md hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Επεξεργασία Πιάτου' : 'Νέο Πιάτο'}>
        <div className="space-y-4">
          {error && (
            <div className="px-3 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#B91C1C] text-[13px]">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Όνομα *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="π.χ. Μουσακάς"
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Κατηγορία *</label>
              <select
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value as CategorySlug }))}
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white"
              >
                {categories.map(c => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Τιμή (€) *</label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Περιγραφή</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Σύντομη περιγραφή..."
                rows={2}
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 resize-none"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="available"
                type="checkbox"
                checked={form.available}
                onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                className="w-4 h-4 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316] accent-[#F97316] cursor-pointer"
              />
              <label htmlFor="available" className="text-[13px] text-[#0A0A0A] cursor-pointer select-none">
                Διαθέσιμο για παραγγελία
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-[#E5E7EB]">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors">
              Ακύρωση
            </button>
            <button
              onClick={saveItem}
              disabled={saving || !form.name.trim() || !form.price}
              className="flex-1 px-4 py-2.5 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-40 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                editItem ? 'Αποθήκευση' : 'Προσθήκη'
              )}
            </button>
          </div>
        </div>
      </Modal>

      <UndoToast pending={undoAction.pending} undo={undoAction.undo} delayMs={undoAction.delayMs} />
    </>
  );
}
