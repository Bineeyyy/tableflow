'use client';

import Link from 'next/link';
import { LogOut, ArrowLeft, Shield, Mail } from 'lucide-react';
import { logout } from '@/app/actions/auth';

export function ProfileTab({ userEmail, restaurantName }: { userEmail: string; restaurantName: string }) {
  return (
    <div className="px-5 py-6 space-y-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="w-20 h-20 rounded-full bg-[#F97316]/15 ring-2 ring-[#F97316]/40 flex items-center justify-center">
          <span className="text-[32px] font-extrabold text-[#F97316]">
            {userEmail.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
        <p className="text-[15px] font-bold text-white truncate max-w-full">{userEmail}</p>
        <p className="text-[12px] text-white/50">{restaurantName}</p>
      </div>

      {/* Info rows */}
      <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
        <div className="px-4 py-3 flex items-center gap-3">
          <Mail size={15} className="text-white/40" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/40">Email</p>
            <p className="text-[13px] text-white/90 truncate">{userEmail}</p>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <Shield size={15} className="text-white/40" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/40">Ρόλος</p>
            <p className="text-[13px] text-white/90">Ιδιοκτήτης</p>
          </div>
        </div>
      </div>

      {/* Back to desktop dashboard */}
      <Link
        href="/dashboard"
        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[13px] font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
      >
        <ArrowLeft size={15} />
        Επιστροφή στο Dashboard
      </Link>

      {/* Logout */}
      <form action={logout}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[13px] font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
        >
          <LogOut size={15} />
          Αποσύνδεση
        </button>
      </form>

      <p className="text-center text-[10px] text-white/30 pt-2">TableFlow · Waiter View</p>
    </div>
  );
}
