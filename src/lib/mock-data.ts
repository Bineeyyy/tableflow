import { Table, Order, Reservation, MenuItem } from '@/types';

export const mockTables: Table[] = [
  { id: 't1', number: 1, seats: 2, status: 'available', x: 80, y: 80, shape: 'round' },
  { id: 't2', number: 2, seats: 2, status: 'occupied', x: 220, y: 80, shape: 'round' },
  { id: 't3', number: 3, seats: 4, status: 'reserved', x: 380, y: 70, shape: 'square' },
  { id: 't4', number: 4, seats: 4, status: 'available', x: 560, y: 70, shape: 'square' },
  { id: 't5', number: 5, seats: 2, status: 'available', x: 740, y: 80, shape: 'round' },
  { id: 't6', number: 6, seats: 6, status: 'occupied', x: 80, y: 250, shape: 'rectangle' },
  { id: 't7', number: 7, seats: 4, status: 'cleaning', x: 300, y: 240, shape: 'square' },
  { id: 't8', number: 8, seats: 4, status: 'available', x: 480, y: 240, shape: 'square' },
  { id: 't9', number: 9, seats: 6, status: 'occupied', x: 660, y: 250, shape: 'rectangle' },
  { id: 't10', number: 10, seats: 2, status: 'available', x: 80, y: 420, shape: 'round' },
  { id: 't11', number: 11, seats: 4, status: 'reserved', x: 220, y: 410, shape: 'square' },
  { id: 't12', number: 12, seats: 8, status: 'available', x: 430, y: 420, shape: 'rectangle', label: 'VIP' },
  { id: 't13', number: 13, seats: 2, status: 'occupied', x: 700, y: 420, shape: 'round' },
];

export const mockOrders: Order[] = [
  { id: 'o1', table_id: 't2', status: 'open', total: 45.50, created_at: new Date(Date.now() - 35 * 60000).toISOString(), guests: 2, notes: '' },
  { id: 'o2', table_id: 't6', status: 'open', total: 128.00, created_at: new Date(Date.now() - 72 * 60000).toISOString(), guests: 5 },
  { id: 'o3', table_id: 't9', status: 'open', total: 87.30, created_at: new Date(Date.now() - 18 * 60000).toISOString(), guests: 4 },
  { id: 'o4', table_id: 't13', status: 'open', total: 32.00, created_at: new Date(Date.now() - 8 * 60000).toISOString(), guests: 2 },
];

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

export const mockReservations: Reservation[] = [
  { id: 'r1', name: 'Μαρία Παπαδοπούλου', phone: '6971234567', date: today, time: '19:00', guests: 4, table_id: 't3', status: 'confirmed', notes: 'Γενέθλια', created_at: new Date().toISOString() },
  { id: 'r2', name: 'Γιάννης Κωσταντίνου', phone: '6987654321', date: today, time: '20:30', guests: 2, table_id: 't11', status: 'pending', notes: '', created_at: new Date().toISOString() },
  { id: 'r3', name: 'Άννα Νικολάου', phone: '6954321678', date: today, time: '21:00', guests: 6, table_id: 't12', status: 'confirmed', notes: 'VIP - εταιρικό δείπνο', created_at: new Date().toISOString() },
  { id: 'r4', name: 'Δημήτρης Αλεξίου', phone: '6932145678', date: tomorrow, time: '19:30', guests: 3, table_id: 't4', status: 'confirmed', notes: '', created_at: new Date().toISOString() },
  { id: 'r5', name: 'Σοφία Θεοδώρου', phone: '6912345789', date: tomorrow, time: '20:00', guests: 5, table_id: 't9', status: 'pending', notes: 'Αλλεργία στα καρύδια', created_at: new Date().toISOString() },
  { id: 'r6', name: 'Νίκος Γεωργίου', phone: '6945678901', date: tomorrow, time: '21:30', guests: 2, table_id: 't1', status: 'confirmed', notes: '', created_at: new Date().toISOString() },
];

export const mockMenuItems: MenuItem[] = [
  // Starters
  { id: 'm1', category: 'starters', name: 'Ταραμοσαλάτα', description: 'Παραδοσιακή ταραμοσαλάτα με φρέσκο ψωμί', price: 6.50, available: true },
  { id: 'm2', category: 'starters', name: 'Τζατζίκι', description: 'Στραγγιστό γιαούρτι, αγγούρι, σκόρδο', price: 5.00, available: true },
  { id: 'm3', category: 'starters', name: 'Μελιτζανοσαλάτα', description: 'Ψητή μελιτζάνα, σκόρδο, ελαιόλαδο', price: 5.50, available: true },
  { id: 'm4', category: 'starters', name: 'Κολοκυθοκεφτέδες', description: 'Φρέσκα κολοκύθια, τυρί, δυόσμος', price: 8.00, available: false },
  // Mains
  { id: 'm5', category: 'mains', name: 'Μουσακάς', description: 'Κλασικός μουσακάς με μπεσαμέλ', price: 14.50, available: true },
  { id: 'm6', category: 'mains', name: 'Παστίτσιο', description: 'Χειροποίητο παστίτσιο ημέρας', price: 13.00, available: true },
  { id: 'm7', category: 'mains', name: 'Αρνί κοκκινιστό', description: 'Αρνί με πατάτες στον φούρνο', price: 18.50, available: true },
  { id: 'm8', category: 'mains', name: 'Γαρίδες σαγανάκι', description: 'Γαρίδες με τυρί φέτα και ντομάτα', price: 16.00, available: true },
  { id: 'm9', category: 'mains', name: 'Χταπόδι βραστό', description: 'Φρέσκο χταπόδι, ξύδι, ελαιόλαδο', price: 17.50, available: false },
  // Salads
  { id: 'm10', category: 'salads', name: 'Χωριάτικη', description: 'Τομάτα, αγγούρι, ελιές, φέτα', price: 9.00, available: true },
  { id: 'm11', category: 'salads', name: 'Ρόκα με παρμεζάνα', description: 'Φρέσκια ρόκα, κέδρα, παρμεζάνα', price: 8.50, available: true },
  // Desserts
  { id: 'm12', category: 'desserts', name: 'Γαλακτομπούρεκο', description: 'Σιρόπι, φύλλο, κρέμα βανίλιας', price: 5.50, available: true },
  { id: 'm13', category: 'desserts', name: 'Λουκουμάδες', description: 'Με μέλι, κανέλα και καρύδι', price: 6.00, available: true },
  // Drinks
  { id: 'm14', category: 'drinks', name: 'Κρασί (μπουκάλι)', description: 'Επιλογή από τον κατάλογο κρασιών', price: 18.00, available: true },
  { id: 'm15', category: 'drinks', name: 'Ούζο (καράφα)', description: '200ml παραδοσιακό ούζο', price: 8.00, available: true },
  { id: 'm16', category: 'drinks', name: 'Μπύρα', description: 'Άλφα ή ξένη εισαγωγής', price: 4.50, available: true },
  { id: 'm17', category: 'drinks', name: 'Αναψυκτικό', description: 'Coca-Cola, Sprite, Fanta 330ml', price: 3.00, available: true },
];

export function getTableOrder(tableId: string): Order | undefined {
  return mockOrders.find(o => o.table_id === tableId && o.status === 'open');
}

export function getElapsedMinutes(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
}
