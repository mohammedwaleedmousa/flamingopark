import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const tokenHash = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, orderId, guestToken, pdfBase64 } = await req.json()
    if (!orderId || !['upload', 'signed_url'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const service = createClient(url, serviceKey)
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })
    const { data: { user } } = await auth.auth.getUser()
    const { data: order, error: orderError } = await service
      .from('orders')
      .select('id,order_number,invoice_url,invoice_owner_user_id,invoice_access_token_hash')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError || !order) throw new Error('Order not found')

    let isAdmin = false
    if (user) {
      const { data: role } = await service
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
      isAdmin = Boolean(role)
    }
    const ownsOrder = Boolean(user && order.invoice_owner_user_id === user.id)
    const hasGuestToken = Boolean(guestToken && order.invoice_access_token_hash && await tokenHash(guestToken) === order.invoice_access_token_hash)

    if (action === 'upload') {
      // Uploads are intentionally limited to an admin or the freshly issued guest token.
      // Authenticated customers can read their invoice but cannot replace it.
      if (!isAdmin && !hasGuestToken) {
        return new Response(JSON.stringify({ error: 'Invoice access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (!pdfBase64) return new Response(JSON.stringify({ error: 'Invalid invoice request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const binary = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0))
      const path = `invoice-${order.order_number}-${Date.now()}.pdf`
      const { error: uploadError } = await service.storage.from('invoices').upload(path, binary, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw uploadError
      const { error: updateError } = await service.from('orders').update({ invoice_url: path }).eq('id', order.id)
      if (updateError) throw updateError
      return new Response(JSON.stringify({ path }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!isAdmin && !ownsOrder && !hasGuestToken) {
      return new Response(JSON.stringify({ error: 'Invoice access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const path = order.invoice_url
    if (!path || /^https?:\/\//i.test(path)) {
      return new Response(JSON.stringify({ error: 'Invoice access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: signed, error: signedError } = await service.storage.from('invoices').createSignedUrl(path, 300)
    if (signedError || !signed?.signedUrl) throw signedError || new Error('Could not sign invoice')
    return new Response(JSON.stringify({ signedUrl: signed.signedUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invoice access failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
