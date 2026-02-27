import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useProperties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setProperties(data || [])
    setLoading(false)
  }, [])

  // Initial load
  useEffect(() => { fetch() }, [fetch])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('properties-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => fetch())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch])

  const addProperty = async (data) => {
    const { error } = await supabase.from('properties').insert([toDb(data)])
    if (error) throw error
  }

  const updateProperty = async (id, data) => {
    const { error } = await supabase.from('properties').update(toDb(data)).eq('id', id)
    if (error) throw error
  }

  const deleteProperty = async (id) => {
    const { error } = await supabase.from('properties').delete().eq('id', id)
    if (error) throw error
  }

  return { properties, loading, error, addProperty, updateProperty, deleteProperty, refresh: fetch }
}

// camelCase ↔ snake_case mapping
function toDb(p) {
  return {
    address:          p.address,
    purchase_price:   p.purchasePrice   || null,
    ownership_pct:    p.ownershipPct    || null,
    title_entity:     p.titleLegalEntity || null,
    current_rent:     p.currentRent     || null,
    loan_provider:    p.loanProvider    || null,
    interest_rate:    p.interestRate    || null,
    mortgage_balance: p.mortgageBalance || null,
    mortgage_username:p.mortgageUsername|| null,
    hoa_portal_url:   p.hoaPortalUrl    || null,
    hoa_username:     p.hoaUsername     || null,
    hoa_dues:         p.hoaDues         || null,
    status:           p.status          || 'active',
  }
}

export function fromDb(p) {
  return {
    id:               p.id,
    createdAt:        p.created_at,
    address:          p.address,
    purchasePrice:    p.purchase_price,
    ownershipPct:     p.ownership_pct,
    titleLegalEntity: p.title_entity,
    currentRent:      p.current_rent,
    loanProvider:     p.loan_provider,
    interestRate:     p.interest_rate,
    mortgageBalance:  p.mortgage_balance,
    mortgageUsername: p.mortgage_username,
    hoaPortalUrl:     p.hoa_portal_url,
    hoaUsername:      p.hoa_username,
    hoaDues:          p.hoa_dues,
    status:           p.status,
  }
}
