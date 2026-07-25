import { supabase } from '@/integrations/supabase/client'

export const getGuestTrackingUrl = (orderNumber: string, guestToken: string) =>
  `/order-tracking?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(guestToken)}`

export const getAccessibleOrder = async (orderNumber: string, guestToken?: string) => {
  const { data, error } = await supabase.functions.invoke('order-access', {
    body: { orderNumber, guestToken },
  })
  if (error || !data?.order) throw error || new Error('Order access denied')
  return data.order as {
    id: string
    order_number: string
    status: string
    created_at: string
    delivery_company_id: string | null
    customer_phone: string
    customer_address: string
    customer_notes: string | null
  }
}
