'use client';

import { useState } from 'react';
import { TopBar } from '@/components/ui/topbar';
import { Modal } from '@/components/ui/modal';
import { mockMenuItems } from '@/lib/mock-data';
import { MenuItem, MenuCategory } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, UtensilsCrossed, Search } from 'lucide-react';

const CATEGORIES: { key: MenuCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Όλα', emoji: '🍽️' },
  { key: 'starters', label: 'Ορεκτικά', emoji: '🥗' },
  { key: 'mains', label: 'Κυρίως', emoji: '🍖' },
  { key: 'salads', label: 'Σαλάτες', emoji: '🥬' },
  { key: 'desserts', label: 'Γλυκά', emoji: '🍮' },
  { key: 'drinks', label: 'Ποτά', emoji: '🍷' },
];

const CATEGORY_LABELS: Record<MenuCategory, string> = {
  starters: 'Ορεκτικά',
  mains: 'Κυρίως',
  salads: 'Σαλάτες',
  desserts: 'Γλυκά',
  drinks: 'Ποτά',
};

const emptyForm = { name: '', category: 'mains' as MenuCategory, description: '', price: '', available: true };

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>(mockMenuItems);
  const [activeCategory, setActiveCategory] = useState<MenuCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(item => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const toggleAvailable = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, available: !i.available } : i));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, description: item.description || '', price: String(item.price), available: item.available });
    setShowModal(true);
  };

  const saveItem = () => {
    if (!form.name || !form.price) return;
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...form, price: parseFloat(form.price) } : i));
    } else {
      const newItem: MenuItem = { id: `m${Date.now()}`, ...form, price: parseFloat(form.price) };
      setItems(prev => [...prev, newItem]);
    }
    setShowModal(false);
  };

  return (
    <>
      <TopBar title="Μενού" subtitle="Διαχείριση καταλόγου εστιατορίου" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Αναζήτηση πιάτου..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:border-terracotta w-64"
            />
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-terracotta hover:bg-terracotta-dark text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-terracotta/20 active:scale-95"
          >
            <Plus size={16} />
            Προσθήκη Πιάτου
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                activeCategory === cat.key
                  ? 'bg-terracotta text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className={cn('text-xs px-1.5 rounded-full',
                activeCategory === cat.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              )}>
                {cat.key === 'all' ? items.length : items.filter(i => i.category === cat.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Items grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 py-16 text-center">
            <UtensilsCrossed size={40} className="mx-auto text-stone-200 mb-3" />
            <p className="text-stone-500">Δεν βρέθηκαν πιάτα</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div key={item.id} className={cn('bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all', !item.available && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      {!item.available && (
                        <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Μη διαθέσιμο</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-stone-800 truncate">{item.name}</h4>
                    {item.description && <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{item.description}</p>}
                  </div>
                  <div className="text-lg font-bold text-terracotta flex-shrink-0">{formatCurrency(item.price)}</div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => toggleAvailable(item.id)}
                    className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    {item.available
                      ? <ToggleRight size={20} className="text-emerald-500" />
                      : <ToggleLeft size={20} className="text-stone-300" />}
                    {item.available ? 'Διαθέσιμο' : 'Μη διαθέσιμο'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Όνομα *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="π.χ. Μουσακάς"
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-terracotta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Κατηγορία *</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as MenuCategory }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-terracotta bg-white"
              >
                {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Τιμή (€) *</label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-terracotta"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Περιγραφή</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Σύντομη περιγραφή..."
                rows={2}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-terracotta resize-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              Ακύρωση
            </button>
            <button
              onClick={saveItem}
              disabled={!form.name || !form.price}
              className="flex-1 px-4 py-2.5 bg-terracotta hover:bg-terracotta-dark disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {editItem ? 'Αποθήκευση' : 'Προσθήκη'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
