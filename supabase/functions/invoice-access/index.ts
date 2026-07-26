import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const hashToken = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, orderId, trackingToken, pdfBase64 } = await req.json()
    if (!orderId || !['upload', 'signed_url'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })
    const { data: { user } } = await auth.auth.getUser()
    const { data: order, error } = await service
      .from('orders')
      .select('id,order_number,invoice_url,owner_user_id,tracking_token_hash')
      .eq('id', orderId)
      .maybeSingle()
    if (error || !order) return new Response(JSON.stringify({ error: 'Invoice access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    let isAdmin = false
    if (user) {
      const { data: role } = await service.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      isAdmin = Boolean(role)
    }
    const isOwner = Boolean(user && order.owner_user_id === user.id)
    const validTrackingToken = Boolean(trackingToken && order.tracking_token_hash && await hashToken(trackingToken) === order.tracking_token_hash)

    if (action === 'upload') {
      if (!isAdmin && !validTrackingToken) return new Response(JSON.stringify({ error: 'Invoice access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      if (!pdfBase64 || typeof pdfBase64 !== 'string' || pdfBase64.length > 8_000_000) {
        return new Response(JSON.stringify({ error: 'Invalid invoice request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const path = `invoice-${order.order_number}-${Date.now()}.pdf`
      const binary = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0))
      const { error: uploadError } = await service.storage.from('invoices').upload(path, binary, { contentType: 'application/pdf', cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { error: updateError } = await service.from('orders').update({ invoice_url: path }).eq('id', order.id)
      if (updateError) throw updateError
      return new Response(JSON.stringify({ path }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!isAdmin && !isOwner && !validTrackingToken) return new Response(JSON.stringify({ error: 'Invoice access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!order.invoice_url || /^https?:\/\//i.test(order.invoice_url)) return new Response(JSON.stringify({ error: 'Invoice access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: signed, error: signedError } = await service.storage.from('invoices').createSignedUrl(order.invoice_url, 300)
    if (signedError || !signed?.signedUrl) throw signedError || new Error('Could not sign invoice')
    return new Response(JSON.stringify({ signedUrl: signed.signedUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Invoice access failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
