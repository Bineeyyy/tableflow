'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/ui/topbar';
import { cn } from '@/lib/utils';
import {
  Store, Clock, User, Grid3x3,
  Save, Eye, EyeOff, ToggleLeft, ToggleRight, MapPin, Phone, Mail, Utensils,
} from 'lucide-react';
import { saveRestaurantSettings, updateTables, type TableEdit } from '@/app/actions/settings';
import { updateProfile, changePassword } from '@/app/actions/account';
import { TABLE_ZONES } from '@/types';
import type { Table } from '@/types';
import type { Tables } from '@/types/database.types';

type Tab = 'restaurant' | 'tables' | 'hours' | 'account';

// "Ειδοποιήσεις" tab removed — the toggles only mutated component state and
// no notification system actually delivered them. Reinstate when real email/
// SMS/push infrastructure exists.
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'restaurant', label: 'Εστιατόριο', icon: Store },
  { key: 'tables', label: 'Τραπέζια', icon: Grid3x3 },
  { key: 'hours', label: 'Ωράριο', icon: Clock },
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

type Props = {
  restaurant: Tables<'restaurants'> | null;
  tableCount: number;
  tables: Table[];
  userEmail: string;
  userFullName: string;
};

type TableRow = TableEdit;

function tableToRow(t: Table): TableRow {
  return {
    id: t.id,
    number: t.number,
    label: t.label ?? '',
    seats: t.seats,
    shape: t.shape,
    zone: t.zone ?? '',
  };
}

export function SettingsForm({ restaurant, tableCount, tables, userEmail, userFullName }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('restaurant');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hours, setHours] = useState<DayHours[]>(parseHours(restaurant?.operating_hours));

  // Per-table edit rows; sorted by number for stable display.
  const [tableRows, setTableRows] = useState<TableRow[]>(
    [...tables].sort((a, b) => a.number - b.number).map(tableToRow)
  );
  const [tablesSaving, setTablesSaving] = useState(false);
  const [tablesSaved, setTablesSaved] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);

  const updateRow = <K extends keyof TableRow>(id: string, key: K, value: TableRow[K]) =>
    setTableRows(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r));

  const handleSaveTables = async () => {
    setTablesSaving(true);
    setTablesError(null);
    const result = await updateTables(tableRows);
    setTablesSaving(false);
    if (result.error) {
      setTablesError(result.error);
      return;
    }
    setTablesSaved(true);
    setTimeout(() => setTablesSaved(false), 2500);
    router.refresh();
  };

  const [restaurantForm, setRestaurantForm] = useState({
    name: restaurant?.name ?? '',
    address: restaurant?.address ?? '',
    phone: restaurant?.phone ?? '',
    email: restaurant?.email ?? '',
    capacity: String(tableCount || 0),
  });

  const [profileName, setProfileName] = useState(userFullName);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [pwd, setPwd] = useState({ current: '', next: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    const result = await updateProfile({ fullName: profileName });
    setProfileSaving(false);
    if (result.error) {
      setProfileError(result.error);
      return;
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
    router.refresh();
  };

  const handleChangePassword = async () => {
    setPwdSaving(true);
    setPwdError(null);
    const result = await changePassword({
      currentPassword: pwd.current,
      newPassword: pwd.next,
    });
    setPwdSaving(false);
    if (result.error) {
      setPwdError(result.error);
      return;
    }
    setPwd({ current: '', next: '' });
    setPwdSaved(true);
    setTimeout(() => setPwdSaved(false), 2500);
  };

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
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6">
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

            {tab === 'tables' && (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-bold text-[#0A0A0A] tracking-tight flex items-center gap-2">
                    <Grid3x3 size={17} className="text-[#F97316]" />
                    Τραπέζια ({tableRows.length})
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">
                    Αλλάξτε αριθμό, ονομασία, χωρητικότητα, σχήμα και ζώνη ανά τραπέζι.
                  </p>
                </div>

                {tableRows.length === 0 ? (
                  <div className="text-center py-12 text-[#6B7280] text-[13px]">
                    Δεν υπάρχουν τραπέζια. Προσθέστε από την καρτέλα <strong>Εστιατόριο</strong>.
                  </div>
                ) : (
                  <>
                    {/* Header row — desktop only */}
                    <div className="hidden md:grid grid-cols-[60px_1fr_70px_120px_1fr_24px] gap-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                      <span>#</span>
                      <span>Όνομα</span>
                      <span>Θέσεις</span>
                      <span>Σχήμα</span>
                      <span>Ζώνη</span>
                      <span />
                    </div>

                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                      {tableRows.map(row => (
                        <div
                          key={row.id}
                          className="grid grid-cols-2 md:grid-cols-[60px_1fr_70px_120px_1fr_24px] gap-2 md:gap-3 items-center bg-[#F8F8F8] md:bg-transparent border md:border-0 border-[#E5E7EB] rounded-lg md:rounded-none p-3 md:p-0"
                        >
                          {/* Number */}
                          <div className="md:col-span-1">
                            <label className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">#</label>
                            <input
                              type="number" min={1} max={999}
                              value={row.number}
                              onChange={e => updateRow(row.id, 'number', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[13px] font-bold tabular-nums focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white"
                            />
                          </div>

                          {/* Label / name */}
                          <div className="md:col-span-1">
                            <label className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Όνομα</label>
                            <input
                              type="text" placeholder="π.χ. VIP, T-7"
                              value={row.label}
                              onChange={e => updateRow(row.id, 'label', e.target.value)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white"
                            />
                          </div>

                          {/* Seats */}
                          <div className="md:col-span-1">
                            <label className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Θέσεις</label>
                            <input
                              type="number" min={1} max={20}
                              value={row.seats}
                              onChange={e => updateRow(row.id, 'seats', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[13px] font-bold tabular-nums focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white"
                            />
                          </div>

                          {/* Shape */}
                          <div className="md:col-span-1">
                            <label className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Σχήμα</label>
                            <select
                              value={row.shape}
                              onChange={e => updateRow(row.id, 'shape', e.target.value as TableRow['shape'])}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white"
                            >
                              <option value="round">Στρογγυλό</option>
                              <option value="square">Τετράγωνο</option>
                              <option value="rectangle">Ορθογώνιο</option>
                            </select>
                          </div>

                          {/* Zone — col-span-2 on mobile to give it room */}
                          <div className="col-span-2 md:col-span-1">
                            <label className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Ζώνη</label>
                            <select
                              value={row.zone}
                              onChange={e => updateRow(row.id, 'zone', e.target.value)}
                              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white"
                            >
                              <option value="">— Καμία —</option>
                              {TABLE_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] flex-wrap gap-2">
                      <div>
                        {tablesSaved && <p className="text-[13px] text-[#10B981] font-bold flex items-center gap-1.5">✓ Τα τραπέζια αποθηκεύτηκαν</p>}
                        {tablesError && <p className="text-[13px] text-[#EF4444] font-bold">{tablesError}</p>}
                      </div>
                      <button onClick={handleSaveTables} disabled={tablesSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                        <Save size={15} strokeWidth={2.6} />
                        {tablesSaving ? 'Αποθήκευση…' : 'Αποθήκευση τραπεζιών'}
                      </button>
                    </div>
                  </>
                )}
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

            {tab === 'account' && (
              <>
                <h3 className="font-bold text-[#0A0A0A] tracking-tight flex items-center gap-2"><User size={17} className="text-[#F97316]" />Στοιχεία Λογαριασμού</h3>

                {/* Profile name — saved to auth user_metadata.full_name */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Ονοματεπώνυμο</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      placeholder="π.χ. Αλέξης Παπαδόπουλος"
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-h-[20px]">
                      {profileSaved && <p className="text-[12px] text-[#10B981] font-bold">✓ Αποθηκεύτηκε</p>}
                      {profileError && <p className="text-[12px] text-[#EF4444] font-bold">{profileError}</p>}
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileSaving || !profileName.trim() || profileName.trim() === userFullName}
                      className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#262626] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded-lg transition-colors"
                    >
                      {profileSaving ? 'Αποθήκευση…' : 'Αποθήκευση ονόματος'}
                    </button>
                  </div>
                </div>

                {/* Email — read-only; changing it requires email re-verification */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={userEmail}
                    readOnly
                    className="w-full px-4 py-2.5 border border-[#E5E7EB] bg-[#F8F8F8] rounded-lg text-[13px] text-[#6B7280] cursor-not-allowed"
                  />
                  <p className="text-[11px] text-[#9CA3AF] mt-1.5">Η αλλαγή email δεν είναι ακόμη διαθέσιμη.</p>
                </div>

                {/* Password change — verifies current password before applying */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <p className="text-[13px] font-bold text-[#0A0A0A] tracking-tight mb-3">Αλλαγή Κωδικού</p>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Τρέχων κωδικός"
                        value={pwd.current}
                        onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
                        className="w-full px-4 py-2.5 pr-10 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="Νέος κωδικός (τουλάχιστον 6 χαρακτήρες)"
                      value={pwd.next}
                      onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex-1 min-h-[20px]">
                      {pwdSaved && <p className="text-[12px] text-[#10B981] font-bold">✓ Ο κωδικός άλλαξε</p>}
                      {pwdError && <p className="text-[12px] text-[#EF4444] font-bold">{pwdError}</p>}
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={pwdSaving || !pwd.current || pwd.next.length < 6}
                      className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#262626] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded-lg transition-colors"
                    >
                      {pwdSaving ? 'Ενημέρωση…' : 'Αλλαγή κωδικού'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Save button — tabs that own their persistence ("tables", "account")
                hide the global bar so the user doesn't see "saved" notices that
                don't reflect what they actually edited. */}
            {tab !== 'tables' && tab !== 'account' && (
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
