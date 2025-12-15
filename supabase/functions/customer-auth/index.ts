import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, phone, country } = await req.json()

    if (!name || !phone || !country) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for existing customer by phone
    const { data: existingCustomer, error: selectError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (selectError) {
      throw selectError
    }

    let customer

    if (existingCustomer) {
      customer = existingCustomer
    } else {
      // Create new customer
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          name,
          phone,
          country,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      customer = newCustomer
    }

    return new Response(
      JSON.stringify({ customer }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Customer auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to authenticate customer' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})