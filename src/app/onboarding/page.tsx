'use client';

import { useActionState } from 'react';
import { UtensilsCrossed, Store, Phone, MapPin, Grid2x2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createRestaurant } from '@/app/actions/onboarding';

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(createRestaurant, undefined);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 relative overflow-hidden">
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.10) 0%, transparent 65%)' }}
      />
      <div className="w-full max-w-xl relative z-10">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-lg bg-[#F97316] flex items-center justify-center">
            <UtensilsCrossed size={22} className="text-white" strokeWidth={2.4} />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">TableFlow</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-[36px] font-extrabold text-white tracking-tight leading-tight">Καλώς ήρθατε!</h1>
          <p className="text-white/55 mt-2 text-[15px]">
            Ρυθμίστε το εστιατόριό σας για να ξεκινήσετε
          </p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#F97316] flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">1</span>
            </div>
            <span className="text-[#F97316] text-[13px] font-semibold">Στοιχεία</span>
          </div>
          <div className="h-px w-10 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">
              <span className="text-white/40 text-[11px] font-bold">2</span>
            </div>
            <span className="text-white/40 text-[13px]">Κάτοψη</span>
          </div>
          <div className="h-px w-10 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">
              <span className="text-white/40 text-[11px] font-bold">3</span>
            </div>
            <span className="text-white/40 text-[13px]">Έτοιμο</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#141414] rounded-lg p-8 border border-white/10 shadow-pop">

          {state?.error && (
            <div className="mb-5 px-4 py-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#FCA5A5] text-[13px]">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">

            {/* Restaurant Name */}
            <div>
              <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">
                Όνομα Εστιατορίου <span className="text-[#F97316]">*</span>
              </label>
              <div className="relative">
                <Store size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="π.χ. Ταβέρνα Ο Αλέξης"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
                />
              </div>
            </div>

            {/* Address & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">
                  Διεύθυνση
                </label>
                <div className="relative">
                  <MapPin size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    type="text"
                    name="address"
                    placeholder="π.χ. Ερμού 12, Αθήνα"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">
                  Τηλέφωνο
                </label>
                <div className="relative">
                  <Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="π.χ. 210 1234567"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Number of Tables */}
            <div>
              <label className="block text-[12px] font-semibold text-white/70 mb-2 uppercase tracking-wider">
                Αριθμός Τραπεζιών <span className="text-[#F97316]">*</span>
              </label>
              <div className="relative">
                <Grid2x2 size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  type="number"
                  name="numTables"
                  required
                  min={1}
                  max={50}
                  defaultValue={8}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
                />
              </div>
              <p className="text-white/40 text-[12px] mt-2">
                Μπορείτε να αλλάξετε τη διάταξη αργότερα (1–50)
              </p>
            </div>

            {/* What you'll get */}
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.1em] mb-3">Τι θα δημιουργηθεί</p>
              {[
                'Εστιατόριο με τα στοιχεία σας',
                'Αυτόματη διάταξη τραπεζιών στην κάτοψη',
                'Έτοιμο για κρατήσεις και παραγγελίες',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#F97316] flex-shrink-0" strokeWidth={2.4} />
                  <span className="text-white/85 text-[13px]">{item}</span>
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg',
                'bg-[#F97316] hover:bg-[#EA580C] text-white font-bold tracking-tight',
                'transition-all duration-150',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'active:scale-[0.98]',
              )}
            >
              {pending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Δημιουργία Εστιατορίου</span>
                  <ArrowRight size={18} strokeWidth={2.6} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-[11px] mt-6">
          Μπορείτε να αλλάξετε όλα τα στοιχεία αργότερα από τις Ρυθμίσεις
        </p>
      </div>
    </div>
  );
}
