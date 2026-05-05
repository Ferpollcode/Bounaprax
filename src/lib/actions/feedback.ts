'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitFeedback(formData: FormData) {
  const message = (formData.get('message') as string | null)?.trim() ?? ''

  if (message.length < 5) {
    return { error: 'Escribí un comentario un poco más completo.' }
  }

  if (message.length > 2000) {
    return { error: 'El feedback no puede superar los 2000 caracteres.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado.' }

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    email: user.email,
    message,
  })

  if (error) return { error: 'No se pudo enviar el feedback.' }
  return { success: true }
}
