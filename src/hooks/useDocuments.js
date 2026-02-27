import { useState, useEffect, useCallback } from 'react'
import { supabase, uploadDocument, getDocumentUrl, deleteDocument } from '../lib/supabase'

export function useDocuments(propertyId = null, leaseId = null) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('documents').select('*').order('created_at', { ascending: false })
    if (leaseId)    q = q.eq('lease_id', leaseId)
    else if (propertyId) q = q.eq('property_id', propertyId)
    const { data, error } = await q
    if (error) setError(error.message)
    else setDocuments(data || [])
    setLoading(false)
  }, [propertyId, leaseId])

  useEffect(() => { fetch() }, [fetch])

  const addDocument = async (file, docType, notes, pId, lId = null) => {
    setUploading(true)
    try {
      const filePath = await uploadDocument(file, pId, lId)
      const { error } = await supabase.from('documents').insert([{
        property_id: pId,
        lease_id:    lId,
        name:        file.name,
        file_path:   filePath,
        file_size:   file.size,
        mime_type:   file.type,
        doc_type:    docType,
        notes:       notes || null,
      }])
      if (error) throw error
      await fetch()
    } finally {
      setUploading(false)
    }
  }

  const removeDocument = async (doc) => {
    await deleteDocument(doc.file_path)
    await supabase.from('documents').delete().eq('id', doc.id)
    await fetch()
  }

  const getUrl = (filePath) => getDocumentUrl(filePath)

  return { documents, loading, uploading, error, addDocument, removeDocument, getUrl, refresh: fetch }
}
