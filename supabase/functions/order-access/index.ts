import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const tokenHash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { orderNumber, guestToken } = await req.json()
    if (!orderNumber) return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const url = Deno.env.get('SUPABASE_URL')!
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })
    const { data: { user } } = await auth.auth.getUser()
    const { data: order, error } = await service
      .from('orders')
      .select('id,order_number,status,created_at,delivery_company_id,customer_phone,customer_address,customer_notes,owner_user_id,guest_access_token_hash')
      .eq('order_number', orderNumber)
      .maybeSingle()
    if (error || !order) return new Response(JSON.stringify({ error: 'Order access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    let isAdmin = false
    if (user) {
      const { data: role } = await service.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      isAdmin = Boolean(role)
    }
    const isOwner = Boolean(user && order.owner_user_id === user.id)
    const validGuestToken = Boolean(guestToken && order.guest_access_token_hash && await tokenHash(guestToken) === order.guest_access_token_hash)
    if (!isAdmin && !isOwner && !validGuestToken) {
      return new Response(JSON.stringify({ error: 'Order access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        delivery_company_id: order.delivery_company_id,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        customer_notes: order.customer_notes,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Order access failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
