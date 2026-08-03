import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const productFields = 'name,name_ar,slug,price,brand,in_stock,description_ar,images,color_variants'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { message, history = [] } = await req.json()
    const question = typeof message === 'string' ? message.trim().slice(0, 600) : ''
    if (!question) return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'AI service is not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const terms = question.split(/\s+/).map((term: string) => term.replace(/[^\p{L}\p{N}]/gu, '')).filter((term: string) => term.length > 1).slice(0, 4)
    const filters = terms.flatMap((term: string) => [`name_ar.ilike.%${term}%`, `name.ilike.%${term}%`, `brand.ilike.%${term}%`, `description_ar.ilike.%${term}%`])
    const { data: products } = filters.length
      ? await supabase.from('products').select(productFields).eq('is_active', true).or(filters.join(',')).limit(8)
      : { data: [] }

    const catalog = (products || []).map((product: any) => ({
      name: product.name_ar || product.name,
      brand: product.brand,
      price: product.price,
      available: product.in_stock,
      url: `/product/${product.slug}`,
      description: product.description_ar || '',
    }))
    const safeHistory = Array.isArray(history) ? history.slice(-6).map((item: any) => ({ role: item?.role === 'assistant' ? 'assistant' : 'user', content: String(item?.text || '').slice(0, 500) })) : []
    const system = `أنت دليل فلامنجو الافتراضي لخدمة العملاء في متجر Flamingo Park. تحدث بالعربية بأسلوب دافئ ومهذب وطبيعي، لكن لا تدّع أنك إنسان أو موظف حقيقي. أجب باختصار وبوضوح. لا تخترع سعرًا أو توفرًا أو سياسة غير موجودة. إن لم تكف البيانات، قل إنك ستوجّه العميل لواتساب. بيانات المنتجات المطابقة: ${JSON.stringify(catalog)}. سياسة الشحن: داخل عدن في اليوم نفسه، وبقية المحافظات عادة من 2 إلى 7 أيام. الإرجاع أو الاستبدال يتم عبر الدعم مع رقم الطلب.`
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.45, max_tokens: 250, messages: [{ role: 'system', content: system }, ...safeHistory, { role: 'user', content: question }] }),
    })
    if (!aiResponse.ok) throw new Error('AI request failed')
    const result = await aiResponse.json()
    const reply = result?.choices?.[0]?.message?.content?.trim()
    if (!reply) throw new Error('AI returned no reply')
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Assistant request failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})