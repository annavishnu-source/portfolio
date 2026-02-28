import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CATEGORIES = [
  'Rental Income', 'Salary', 'Investment Returns', 'Other Income',
  'Mortgage', 'HOA Dues', 'Property Tax', 'Repairs', 'Utilities', 'Rent',
  'Groceries', 'Dining Out', 'Gas', 'Shopping', 'Transportation',
  'Investments', 'Insurance', 'Loan Payment', 'Savings Transfer', 'Fees & Charges',
  'Healthcare', 'Subscriptions', 'Travel', 'Entertainment', 'Education',
  'Business Expense', 'Transfer', 'Uncategorized'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const logs: string[] = []

  try {
    logs.push('Starting categorize-transactions')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    logs.push(`supabaseUrl: ${supabaseUrl ? 'present' : 'MISSING'}`)
    logs.push(`supabaseKey: ${supabaseKey ? 'present' : 'MISSING'}`)
    logs.push(`anthropicKey: ${anthropicKey ? 'present' : 'MISSING'}`)

    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env vars')
    if (!anthropicKey) throw new Error('Missing ANTHROPIC_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get uncategorized transactions
    const { data: txns, error: txnErr } = await supabase
      .from('transactions')
      .select('id, description, memo, amount')
      .is('category_id', null)
      .limit(50)

    if (txnErr) throw new Error(`DB error: ${txnErr.message}`)
    logs.push(`Found ${txns?.length || 0} uncategorized transactions`)

    if (!txns || txns.length === 0) {
      return new Response(JSON.stringify({ success: true, categorized: 0, logs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build prompt
    const txnList = txns.map((t, i) =>
      `${i + 1}. desc="${t.description || ''}" amount=${t.amount}`
    ).join('\n')

    const prompt = `Categorize each transaction into exactly one category from this list:
${CATEGORIES.join(', ')}

Rules:
- Negative = expense, positive = income/credit
- Large transfers between accounts = "Transfer"
- Payroll/direct deposit = "Salary"
- Grocery stores = "Groceries"
- Restaurants/food delivery = "Dining Out"
- Gas stations = "Gas"
- Netflix/Spotify/subscriptions = "Subscriptions"
- If unclear = "Uncategorized"

Transactions:
${txnList}

Respond ONLY with a JSON array, no other text:
[{"id":1,"category":"category name","confidence":0.95}]`

    logs.push('Calling Claude API')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    logs.push(`Claude API status: ${claudeRes.status}`)

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      throw new Error(`Claude API error (${claudeRes.status}): ${errText}`)
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text?.trim() || '[]'
    logs.push(`Claude response: ${responseText.slice(0, 100)}`)

    // Parse JSON — strip markdown if present
    const clean = responseText.replace(/```json|```/g, '').trim()
    const categorizations = JSON.parse(clean)

    // Get category IDs
    const { data: categoryRows } = await supabase.from('categories').select('id, name')
    const categoryMap: Record<string, string> = {}
    for (const c of categoryRows || []) categoryMap[c.name] = c.id

    // Update transactions
    let categorized = 0
    for (const result of categorizations) {
      const txn = txns[result.id - 1]
      if (!txn) continue
      const categoryId = categoryMap[result.category] || categoryMap['Uncategorized']
      if (!categoryId) continue
      await supabase.from('transactions').update({
        category_id:   categoryId,
        category_name: result.category,
        ai_category:   result.category,
        ai_confidence: result.confidence,
      }).eq('id', txn.id)
      categorized++
    }

    logs.push(`Categorized ${categorized} transactions`)

    return new Response(JSON.stringify({ success: true, categorized, logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('categorize error:', err.message, logs)
    return new Response(JSON.stringify({ error: err.message, logs }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
