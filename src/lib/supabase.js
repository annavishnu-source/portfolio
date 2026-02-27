import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('⚠️  Missing Supabase env vars. Copy .env.example to .env and fill in your credentials.')
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 10 } }
})

// ── Storage helpers ───────────────────────────────────────────────────────────
export const BUCKET = 'documents'

export async function uploadDocument(file, propertyId, leaseId = null) {
  const folder = leaseId ? `leases/${leaseId}` : `properties/${propertyId}`
  const filePath = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return data.path
}

export async function getDocumentUrl(filePath) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600)
  return data?.signedUrl
}

export async function deleteDocument(filePath) {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath])
  if (error) throw error
}
