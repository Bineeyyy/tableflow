'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/ui/topbar';
import { cn } from '@/lib/utils';
import {
  Store, Clock, Bell, User,
  Save, Eye, EyeOff, ToggleLeft, ToggleRight, MapPin, Phone, Mail, Utensils,
} from 'lucide-react';
import { saveRestaurantSettings } from '@/app/actions/settings';
import type { Tables } from '@/types/database.types';

type Tab = 'restaurant' | 'hours' | 'notifications' | 'account';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'restaurant', label: 'Εστιατόριο', icon: Store },
  { key: 'hours', label: 'Ωράριο', icon: Clock },
  { key: 'notifications', label: 'Ειδοποιήσεις', icon: Bell },
  { key: 'account', label: 'Λογαριασμός', icon: User },
];

const DAYS = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];

type DayHours = { open: boolean; from: string; to: string };

const DEFAULT_HOURS: DayHours[] = [
  { open: false, from: '12:00', to: '24:00' },
  { open: true,  from: '12:00', to: '24:00' },
  { open: true,  from: '12:00', to: '24:00' },
  { open: true,  from: '12:00', to: '24:00' },
  { open: true,  from: '12:00', to: '01:00' },
  { open: true,  from: '12:00', to: '02:00' },
  { open: true,  from: '13:00', to: '24:00' },
];

function parseHours(raw: unknown): DayHours[] {
  if (!Array.isArray(raw) || raw.length !== 7) return DEFAULT_HOURS;
  return raw as DayHours[];
}

function FieldInput({ label, icon: Icon, ...props }: { label: string; icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
        <input {...props} className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 transition-colors" />
      </div>
    </div>
  );
}

function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#E5E7EB] last:border-0">
      <span className="text-[13px] font-medium text-[#0A0A0A]">{label}</span>
      <button onClick={onToggle} className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
        {enabled
          ? <ToggleRight size={28} className="text-[#F97316]" />
          : <ToggleLeft size={28} className="text-[#D1D5DB]" />}
      </button>
    </div>
  );
}

type Props = {
  restaurant: Tables<'restaurants'> | null;
  tableCount: number;
  userEmail: string;
};

export function SettingsForm({ restaurant, tableCount, userEmail }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('restaurant');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hours, setHours] = useState<DayHours[]>(parseHours(restaurant?.operating_hours));

  const [restaurantForm, setRestaurantForm] = useState({
    name: restaurant?.name ?? '',
    address: restaurant?.address ?? '',
    phone: restaurant?.phone ?? '',
    email: restaurant?.email ?? '',
    capacity: String(tableCount || 0),
  });

  const [notifs, setNotifs] = useState({
    newReservation: true, orderClosed: false, lowOccupancy: true,
    dailySummary: true, marketingEmails: false,
  });

  const [account, setAccount] = useState({
    firstName: '', lastName: '',
    email: userEmail, currentPassword: '', newPassword: '',
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    const result = await saveRestaurantSettings({
      name: restaurantForm.name,
      address: restaurantForm.address,
      phone: restaurantForm.phone,
      email: restaurantForm.email,
      capacity: parseInt(restaurantForm.capacity) || 1,
      hours,
    });

    setSaving(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  };

  const toggleHour = (i: number) => setHours(prev => prev.map((h, idx) => idx === i ? { ...h, open: !h.open } : h));
  const setHourField = (i: number, field: 'from' | 'to', value: string) =>
    setHours(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h));

  return (
    <>
      <TopBar title="Ρυθμίσεις" subtitle="Παραμετροποίηση λογαριασμού" />
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-lg border border-[#E5E7EB] shadow-card p-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-bold transition-all',
                    tab === t.key
                      ? 'bg-[#0A0A0A] text-white'
                      : 'text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F8F8F8]')}>
                  <Icon size={15} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-4 md:p-6 space-y-5">

            {tab === 'restaurant' && (
              <>
                <h3 className="font-bold text-[#0A0A0A] tracking-tight flex items-center gap-2"><Utensils size={17} className="text-[#F97316]" />Στοιχεία Εστιατορίου</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FieldInput label="Όνομα εστιατορίου" icon={Store} value={restaurantForm.name}
                      onChange={e => setRestaurantForm(r => ({ ...r, name: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldInput label="Διεύθυνση" icon={MapPin} value={restaurantForm.address}
                      onChange={e => setRestaurantForm(r => ({ ...r, address: e.target.value }))} />
                  </div>
                  <FieldInput label="Τηλέφωνο" icon={Phone} type="tel" value={restaurantForm.phone}
                    onChange={e => setRestaurantForm(r => ({ ...r, phone: e.target.value }))} />
                  <FieldInput label="Email επικοινωνίας" icon={Mail} type="email" value={restaurantForm.email}
                    onChange={e => setRestaurantForm(r => ({ ...r, email: e.target.value }))} />
                  <div>
                    <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Αριθμός τραπεζιών</label>
                    <input type="number" min="1" max="200" value={restaurantForm.capacity}
                      onChange={e => setRestaurantForm(r => ({ ...r, capacity: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
                  </div>
                </div>
              </>
            )}

            {tab === 'hours' && (
              <>
                <h3 className="font-bold text-[#0A0A0A] tracking-tight flex items-center gap-2"><Clock size={17} className="text-[#F97316]" />Ωράριο Λειτουργίας</h3>
                <div className="space-y-2">
                  {DAYS.map((day, i) => (
                    <div key={day} className="flex items-center gap-4 py-2 border-b border-[#E5E7EB] last:border-0">
                      <div className="w-24 flex items-center gap-2">
                        <button onClick={() => toggleHour(i)}>
                          {hours[i].open
                            ? <ToggleRight size={22} className="text-[#F97316]" />
                            : <ToggleLeft size={22} className="text-[#D1D5DB]" />}
                        </button>
                        <span className={cn('text-[13px] font-bold', hours[i].open ? 'text-[#0A0A0A]' : 'text-[#9CA3AF]')}>{day.slice(0, 3)}.</span>
                      </div>
                      {hours[i].open ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={hours[i].from} onChange={e => setHourField(i, 'from', e.target.value)}
                            className="px-3 py-1.5 border border-[#E5E7EB] rounded-md text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white" />
                          <span className="text-[#9CA3AF] text-[13px]">—</span>
                          <input type="time" value={hours[i].to} onChange={e => setHourField(i, 'to', e.target.value)}
                            className="px-3 py-1.5 border border-[#E5E7EB] rounded-md text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white" />
                        </div>
                      ) : (
                        <span className="text-[13px] text-[#9CA3AF] italic">Κλειστό</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'notifications' && (
              <>
                <h3 className="font-bold text-[#0A0A0A] tracking-tight flex items-center gap-2"><Bell size={17} className="text-[#F97316]" />Ειδοποιήσεις</h3>
                <div>
                  <Toggle enabled={notifs.newReservation} onToggle={() => setNotifs(n => ({ ...n, newReservation: !n.newReservation }))} label="Νέα κράτηση" />
                  <Toggle enabled={notifs.orderClosed} onToggle={() => setNotifs(n => ({ ...n, orderClosed: !n.orderClosed }))} label="Κλείσιμο παραγγελίας" />
                  <Toggle enabled={notifs.lowOccupancy} onToggle={() => setNotifs(n => ({ ...n, lowOccupancy: !n.lowOccupancy }))} label="Χαμηλή πληρότητα (< 20%)" />
                  <Toggle enabled={notifs.dailySummary} onToggle={() => setNotifs(n => ({ ...n, dailySummary: !n.dailySummary }))} label="Ημερήσια περίληψη (email)" />
                  <Toggle enabled={notifs.marketingEmails} onToggle={() => setNotifs(n => ({ ...n, marketingEmails: !n.marketingEmails }))} label="Newsletter & ανακοινώσεις" />
                </div>
              </>
            )}

            {tab === 'account' && (
              <>
                <h3 className="font-bold text-[#0A0A0A] tracking-tight flex items-center gap-2"><User size={17} className="text-[#F97316]" />Στοιχεία Λογαριασμού</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Όνομα</label>
                    <input type="text" value={account.firstName} onChange={e => setAccount(a => ({ ...a, firstName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Επώνυμο</label>
                    <input type="text" value={account.lastName} onChange={e => setAccount(a => ({ ...a, lastName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Email</label>
                    <input type="email" value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
                  </div>
                  <div className="col-span-2 pt-2 border-t border-[#E5E7EB]">
                    <p className="text-[13px] font-bold text-[#0A0A0A] tracking-tight mb-3">Αλλαγή Κωδικού</p>
                    <div className="space-y-3">
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} placeholder="Τρέχων κωδικός"
                          value={account.currentPassword} onChange={e => setAccount(a => ({ ...a, currentPassword: e.target.value }))}
                          className="w-full px-4 py-2.5 pr-10 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <input type="password" placeholder="Νέος κωδικός"
                        value={account.newPassword} onChange={e => setAccount(a => ({ ...a, newPassword: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Save button */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
              <div>
                {saved && <p className="text-[13px] text-[#10B981] font-bold flex items-center gap-1.5">✓ Οι αλλαγές αποθηκεύτηκαν</p>}
                {saveError && <p className="text-[13px] text-[#EF4444] font-bold">{saveError}</p>}
              </div>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                <Save size={15} strokeWidth={2.6} />
                {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
