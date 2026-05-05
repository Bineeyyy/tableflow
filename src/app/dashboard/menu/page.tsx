'use client';

import { useState } from 'react';
import { TopBar } from '@/components/ui/topbar';
import { Modal } from '@/components/ui/modal';
import { mockMenuItems } from '@/lib/mock-data';
import { MenuItem, MenuCategory } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, UtensilsCrossed, Search } from 'lucide-react';

const CATEGORIES: { key: MenuCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Όλα' },
  { key: 'starters', label: 'Ορεκτικά' },
  { key: 'mains', label: 'Κυρίως' },
  { key: 'salads', label: 'Σαλάτες' },
  { key: 'desserts', label: 'Γλυκά' },
  { key: 'drinks', label: 'Ποτά' },
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
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all',
                activeCategory === cat.key
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white text-[#0A0A0A] hover:bg-[#F8F8F8] border border-[#E5E7EB]'
              )}
            >
              <span>{cat.label}</span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-bold tabular-nums',
                activeCategory === cat.key ? 'bg-white/20 text-white' : 'bg-[#F8F8F8] text-[#6B7280]'
              )}>
                {cat.key === 'all' ? items.length : items.filter(i => i.category === cat.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Items grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E5E7EB] py-16 text-center">
            <UtensilsCrossed size={40} className="mx-auto text-[#D1D5DB] mb-3" />
            <p className="text-[#6B7280] text-[13px]">Δεν βρέθηκαν πιάτα</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div key={item.id} className={cn('bg-white rounded-lg border border-[#0A0A0A] p-5 shadow-card hover:shadow-card-hover transition-all', !item.available && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] bg-[#F8F8F8] text-[#6B7280] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-[#E5E7EB]">
                        {CATEGORY_LABELS[item.category]}
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
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-md hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors">
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
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as MenuCategory }))}
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white"
              >
                {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
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
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-[#E5E7EB]">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors">
              Ακύρωση
            </button>
            <button
              onClick={saveItem}
              disabled={!form.name || !form.price}
              className="flex-1 px-4 py-2.5 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-40 text-white text-[13px] font-bold rounded-lg transition-colors"
            >
              {editItem ? 'Αποθήκευση' : 'Προσθήκη'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
