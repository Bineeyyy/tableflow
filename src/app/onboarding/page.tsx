'use client';

import { useActionState } from 'react';
import { UtensilsCrossed, Store, Phone, MapPin, Grid2x2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createRestaurant } from '@/app/actions/onboarding';

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(createRestaurant, undefined);

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-2xl bg-terracotta flex items-center justify-center shadow-lg shadow-terracotta/30">
            <UtensilsCrossed size={22} className="text-white" />
          </div>
          <span className="text-white text-2xl font-bold">TableFlow</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Καλώς ήρθατε!</h1>
          <p className="text-stone-400 mt-2">
            Ρυθμίστε το εστιατόριό σας για να ξεκινήσετε
          </p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-terracotta flex items-center justify-center">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <span className="text-terracotta text-sm font-medium">Στοιχεία</span>
          </div>
          <div className="h-px w-10 bg-stone-700" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center">
              <span className="text-stone-500 text-xs font-bold">2</span>
            </div>
            <span className="text-stone-500 text-sm">Κάτοψη</span>
          </div>
          <div className="h-px w-10 bg-stone-700" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center">
              <span className="text-stone-500 text-xs font-bold">3</span>
            </div>
            <span className="text-stone-500 text-sm">Έτοιμο</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-stone-900 rounded-2xl p-8 border border-stone-800 shadow-2xl">

          {state?.error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">

            {/* Restaurant Name */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Όνομα Εστιατορίου <span className="text-terracotta">*</span>
              </label>
              <div className="relative">
                <Store size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="π.χ. Ταβέρνα Ο Αλέξης"
                  className="w-full pl-11 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors"
                />
              </div>
            </div>

            {/* Address & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2">
                  Διεύθυνση
                </label>
                <div className="relative">
                  <MapPin size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                  <input
                    type="text"
                    name="address"
                    placeholder="π.χ. Ερμού 12, Αθήνα"
                    className="w-full pl-11 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2">
                  Τηλέφωνο
                </label>
                <div className="relative">
                  <Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="π.χ. 210 1234567"
                    className="w-full pl-11 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Number of Tables */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Αριθμός Τραπεζιών <span className="text-terracotta">*</span>
              </label>
              <div className="relative">
                <Grid2x2 size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                <input
                  type="number"
                  name="numTables"
                  required
                  min={1}
                  max={50}
                  defaultValue={8}
                  className="w-full pl-11 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors"
                />
              </div>
              <p className="text-stone-500 text-xs mt-1.5">
                Μπορείτε να αλλάξετε τη διάταξη αργότερα (1–50)
              </p>
            </div>

            {/* What you'll get */}
            <div className="bg-stone-800/60 rounded-xl p-4 space-y-2">
              <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">Τι θα δημιουργηθεί</p>
              {[
                'Εστιατόριο με τα στοιχεία σας',
                'Αυτόματη διάταξη τραπεζιών στην κάτοψη',
                'Έτοιμο για κρατήσεις και παραγγελίες',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-terracotta flex-shrink-0" />
                  <span className="text-stone-300 text-sm">{item}</span>
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl',
                'bg-terracotta hover:bg-terracotta-dark text-white font-semibold',
                'transition-all duration-200 shadow-lg shadow-terracotta/30',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'active:scale-[0.98]',
              )}
            >
              {pending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Δημιουργία Εστιατορίου</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-stone-600 text-xs mt-6">
          Μπορείτε να αλλάξετε όλα τα στοιχεία αργότερα από τις Ρυθμίσεις
        </p>
      </div>
    </div>
  );
}
