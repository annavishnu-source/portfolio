import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCashAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const [error, setError]       = useState(null)
  const [lastSynced, setLastSynced] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cash_accounts')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('owner', { ascending: true })
    if (error) setError(error.message)
    else setAccounts(data || [])
    setLoading(false)

    // Also get last synced
    const { data: config } = await supabase
      .from('simplefin_config')
      .select('last_synced')
      .single()
    if (config) setLastSynced(config.last_synced)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('cash-accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_accounts' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch])

  const syncBalances = async () => {
    setSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke('simplefin-sync', {
        body: { mode: 'balances' }
      })
      if (error) throw error
      await fetch()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSyncing(false)
    }
  }

  const syncTransactions = async (accountId, days = 30) => {
    const { data, error } = await supabase.functions.invoke('simplefin-sync', {
      body: { mode: 'transactions', account_id: accountId, days }
    })
    if (error) throw error
    // Trigger AI categorization after sync
    await supabase.functions.invoke('categorize-transactions', { body: {} })
    return data
  }

  const updateAccount = async (id, updates) => {
    const { error } = await supabase.from('cash_accounts').update(updates).eq('id', id)
    if (error) throw error
    await fetch()
  }

  const saveSimpleFinToken = async (setupToken) => {
    // Send setup token to edge function — it claims server-side (avoids CORS)
    const { data, error } = await supabase.functions.invoke('simplefin-sync', {
      body: { mode: 'claim', setup_token: setupToken.trim() }
    })
    if (error) throw new Error(error.message || 'Failed to connect SimpleFIN')
    if (data?.error) throw new Error(data.error)

    // Immediately sync balances
    return syncBalances()
  }

  const hasConfig = async () => {
    const { data } = await supabase
      .from('simplefin_config')
      .select('id, access_url')
      .maybeSingle()
    return !!(data?.access_url)
  }

  return {
    accounts, loading, syncing, error, lastSynced,
    syncBalances, syncTransactions, updateAccount, saveSimpleFinToken, hasConfig, refresh: fetch
  }
}

export function useTransactions(accountId) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(false)
  const [categorizing, setCategorizing] = useState(false)

  const fetch = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*, categories(name, icon, color, parent)')
      .eq('account_id', accountId)
      .order('posted_date', { ascending: false })
      .limit(200)
    setTransactions(data || [])
    setLoading(false)
  }, [accountId])

  useEffect(() => { fetch() }, [fetch])

  const updateCategory = async (txnId, categoryId, categoryName) => {
    await supabase.from('transactions').update({
      category_id:   categoryId,
      category_name: categoryName,
      user_override: true,
    }).eq('id', txnId)
    await fetch()
  }

  const runAICategorization = async () => {
    setCategorizing(true)
    try {
      await supabase.functions.invoke('categorize-transactions', { body: {} })
      await fetch()
    } finally {
      setCategorizing(false)
    }
  }

  return { transactions, loading, categorizing, updateCategory, runAICategorization, refresh: fetch }
}

export function useCategories() {
  const [categories, setCategories] = useState([])
  useEffect(() => {
    supabase.from('categories').select('*').order('parent').order('name')
      .then(({ data }) => setCategories(data || []))
  }, [])
  return categories
}
