import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useLeases(propertyId = null) {
  const [leases, setLeases]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('leases').select('*').order('lease_start', { ascending: false })
    if (propertyId) q = q.eq('property_id', propertyId)
    const { data, error } = await q
    if (error) setError(error.message)
    else setLeases(data || [])
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetch() }, [fetch])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`leases-${propertyId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, () => fetch())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch, propertyId])

  const addLease = async (data) => {
    const { error } = await supabase.from('leases').insert([toDb(data)])
    if (error) throw error
  }

  const updateLease = async (id, data) => {
    const { error } = await supabase.from('leases').update(toDb(data)).eq('id', id)
    if (error) throw error
  }

  const deleteLease = async (id) => {
    const { error } = await supabase.from('leases').delete().eq('id', id)
    if (error) throw error
  }

  return { leases, loading, error, addLease, updateLease, deleteLease, refresh: fetch }
}

function toDb(l) {
  return {
    property_id:      l.propertyId,
    tenant_name:      l.tenantName,
    tenant_email:     l.tenantEmail      || null,
    tenant_phone:     l.tenantPhone      || null,
    lease_start:      l.leaseStart,
    lease_end:        l.leaseEnd,
    monthly_rent:     l.monthlyRent      || null,
    security_deposit: l.securityDeposit  || null,
    rent_due_day:     l.rentDueDay       || 1,
    status:           l.status           || 'active',
    notes:            l.notes            || null,
  }
}

export function leaseFromDb(l) {
  return {
    id:              l.id,
    propertyId:      l.property_id,
    tenantName:      l.tenant_name,
    tenantEmail:     l.tenant_email,
    tenantPhone:     l.tenant_phone,
    leaseStart:      l.lease_start,
    leaseEnd:        l.lease_end,
    monthlyRent:     l.monthly_rent,
    securityDeposit: l.security_deposit,
    rentDueDay:      l.rent_due_day,
    status:          l.status,
    notes:           l.notes,
    createdAt:       l.created_at,
  }
}
