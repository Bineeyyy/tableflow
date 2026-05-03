import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TableFlow — Διαχείριση Τραπεζιών Εστιατορίου',
  description: 'Σύστημα διαχείρισης τραπεζιών για εστιατόρια. Οργανώστε τους πελάτες σας εύκολα και γρήγορα.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
