import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let body = {}
    try { body = await req.json() } catch { body = {} }

    const { mode = 'balances', account_id, days = 30, setup_token } = body as any

    // ── CLAIM MODE ────────────────────────────────────────────
    if (mode === 'claim') {
      if (!setup_token) {
        return new Response(JSON.stringify({ error: 'setup_token is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let claimUrl: string
      try {
        claimUrl = atob(setup_token.trim())
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid setup token format' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const claimRes = await fetch(claimUrl, { method: 'POST' })
      if (!claimRes.ok) {
        const errText = await claimRes.text()
        throw new Error(`SimpleFIN claim failed (${claimRes.status}): ${errText}`)
      }
      const accessUrl = (await claimRes.text()).trim()

      // Check if config already exists
      const { data: existing } = await supabase
        .from('simplefin_config')
        .select('id')
        .maybeSingle()

      if (existing) {
        await supabase.from('simplefin_config')
          .update({ access_url: accessUrl })
          .eq('id', existing.id)
      } else {
        await supabase.from('simplefin_config')
          .insert({ access_url: accessUrl })
      }

      return new Response(JSON.stringify({ success: true, mode: 'claim' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── BALANCES / TRANSACTIONS MODE ──────────────────────────
    const { data: config } = await supabase
      .from('simplefin_config')
      .select('access_url')
      .maybeSingle()

    if (!config?.access_url) {
      return new Response(JSON.stringify({ error: 'SimpleFIN not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const accessUrl = config.access_url
    // Parse auth from access URL: https://user:pass@host/path
    const urlObj    = new URL(accessUrl)
    const authStr   = btoa(`${urlObj.username}:${urlObj.password}`)
    urlObj.username = ''
    urlObj.password = ''
    const baseUrl   = urlObj.toString().replace(/\/$/, '')
    const apiUrl    = new URL(`${baseUrl}/accounts`)

    if (mode === 'transactions') {
      const startDate = Math.floor(Date.now() / 1000) - (days * 86400)
      apiUrl.searchParams.set('start-date', String(startDate))
      if (account_id) apiUrl.searchParams.set('account', account_id)
    }

    const sfRes = await fetch(apiUrl.toString(), {
      headers: { 'Authorization': `Basic ${authStr}` }
    })

    if (!sfRes.ok) {
      const errText = await sfRes.text()
      throw new Error(`SimpleFIN API error (${sfRes.status}): ${errText}`)
    }

    const sfData = await sfRes.json()
    const results = { accounts: 0, transactions: 0 }

    for (const acct of sfData.accounts || []) {
      const accountData = {
        simplefin_id:  acct.id,
        name:          acct.name,
        institution:   acct.org?.name || null,
        currency:      acct.currency || 'USD',
        balance:       parseFloat(acct.balance) || 0,
        balance_date:  acct['balance-date']
          ? new Date(acct['balance-date'] * 1000).toISOString()
          : new Date().toISOString(),
      }

      const { data: existing } = await supabase
        .from('cash_accounts')
        .select('id')
        .eq('simplefin_id', acct.id)
        .maybeSingle()

      if (existing) {
        await supabase.from('cash_accounts').update(accountData).eq('id', existing.id)
      } else {
        await supabase.from('cash_accounts').insert({
          ...accountData, owner: 'Joint', account_type: 'checking', display_order: 0,
        })
      }
      results.accounts++

      // Sync transactions if requested
      if (mode === 'transactions' && acct.transactions?.length) {
        const { data: acctRow } = await supabase
          .from('cash_accounts').select('id').eq('simplefin_id', acct.id).maybeSingle()
        if (!acctRow) continue

        for (const txn of acct.transactions) {
          const { data: existingTxn } = await supabase
            .from('transactions').select('id').eq('simplefin_id', txn.id).maybeSingle()
          if (!existingTxn) {
            await supabase.from('transactions').insert({
              account_id:   acctRow.id,
              simplefin_id: txn.id,
              posted_date:  new Date(txn.posted * 1000).toISOString().split('T')[0],
              amount:       parseFloat(txn.amount) || 0,
              description:  txn.description || '',
              memo:         txn.memo || null,
              pending:      txn.pending || false,
            })
            results.transactions++
          }
        }
      }
    }

    await supabase.from('simplefin_config')
      .update({ last_synced: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('simplefin-sync error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
