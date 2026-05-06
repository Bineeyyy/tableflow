'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(input: { fullName: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Μη εξουσιοδοτημένος' }

  const trimmed = input.fullName.trim()
  if (!trimmed) return { error: 'Το όνομα δεν μπορεί να είναι κενό' }

  const { error } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  })
  if (error) {
    console.error('[account] updateUser failed:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
}) {
  if (input.newPassword.length < 6) {
    return { error: 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'Μη εξουσιοδοτημένος' }

  // Re-authenticate with the current password before allowing a change. This
  // protects against a stolen-session attacker who can't supply the old
  // password — the equivalent of the "confirm to continue" reauth pattern.
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  })
  if (verifyErr) {
    return { error: 'Ο τρέχων κωδικός είναι λάθος' }
  }

  const { error } = await supabase.auth.updateUser({ password: input.newPassword })
  if (error) {
    console.error('[account] password update failed:', error)
    return { error: error.message }
  }

  return { success: true }
}
