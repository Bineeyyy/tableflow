import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

// rememberMeDays: undefined = Supabase defaults, 0 = session cookies, >0 = persistent N days
export async function createClient(rememberMeDays?: number) {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (rememberMeDays === 0) {
                const opts = { ...options };
                delete (opts as Record<string, unknown>).maxAge;
                delete (opts as Record<string, unknown>).expires;
                cookieStore.set(name, value, opts);
              } else if (rememberMeDays !== undefined) {
                cookieStore.set(name, value, { ...options, maxAge: rememberMeDays * 24 * 60 * 60 });
              } else {
                cookieStore.set(name, value, options);
              }
            });
          } catch {
            // Server component — cookies are read-only during render
          }
        },
      },
    }
  );
}
