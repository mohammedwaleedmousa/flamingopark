import { supabase } from '@/integrations/supabase/client'

export const getInvoiceSignedUrl = async (orderId: string, guestToken?: string) => {
  const { data, error } = await supabase.functions.invoke('invoice-access', { body: { action: 'signed_url', orderId, guestToken } })
  if (error || !data?.signedUrl) throw error || new Error('Invoice unavailable')
  return data.signedUrl as string
}
