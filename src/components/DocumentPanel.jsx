import { useState, useRef } from 'react'
import { useDocuments } from '../hooks/useDocuments'
import { DOC_TYPES, fmtDate, fmtFileSize, Spinner } from './shared'

export function DocumentPanel({ propertyId, leaseId = null }) {
  const { documents, loading, uploading, addDocument, removeDocument, getUrl } = useDocuments(propertyId, leaseId)
  const [dragOver, setDragOver] = useState(false)
  const [docType, setDocType]   = useState('other')
  const [notes, setNotes]       = useState('')
  const fileRef = useRef()

  const handleFiles = async (files) => {
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) { alert(`${file.name} exceeds 50MB limit`); continue }
      await addDocument(file, docType, notes, propertyId, leaseId)
    }
    setNotes('')
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  const openDoc = async (doc) => {
    const url = await getUrl(doc.file_path)
    if (url) window.open(url, '_blank')
  }

  const DOC_ICONS = {
    lease: '📄', addendum: '📎', inspection: '🔍', insurance: '🛡',
    tax: '🧾', deed: '🏛', hoa: '🏘', other: '📁',
  }

  return (
    <div className="doc-panel">
      <div className="doc-panel-header">
        <h4 className="doc-panel-title">Documents</h4>
        <span className="doc-count">{documents.length}</span>
      </div>

      {/* Upload area */}
      <div className="doc-controls">
        <select className="form-input compact" value={docType} onChange={e => setDocType(e.target.value)}>
          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          className="form-input compact"
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <button className="btn-upload" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner size={14} /> : '↑'} Upload
        </button>
        <input ref={fileRef} type="file" multiple hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={e => handleFiles(Array.from(e.target.files))} />
      </div>

      <div
        className={`drop-zone ${dragOver ? 'active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        Drop files here to upload · PDF, DOC, DOCX, JPG, PNG · Max 50MB
      </div>

      {/* Document list */}
      {loading ? (
        <div className="doc-loading"><Spinner /></div>
      ) : documents.length === 0 ? (
        <p className="doc-empty">No documents uploaded yet.</p>
      ) : (
        <div className="doc-list">
          {documents.map(doc => (
            <div key={doc.id} className="doc-item">
              <span className="doc-icon">{DOC_ICONS[doc.doc_type] || '📁'}</span>
              <div className="doc-info">
                <button className="doc-name" onClick={() => openDoc(doc)}>{doc.name}</button>
                <span className="doc-meta">
                  {DOC_TYPES.find(t => t.value === doc.doc_type)?.label}
                  {doc.file_size && ` · ${fmtFileSize(doc.file_size)}`}
                  {' · '}{fmtDate(doc.created_at?.slice(0,10))}
                </span>
                {doc.notes && <span className="doc-notes">{doc.notes}</span>}
              </div>
              <button className="doc-delete" onClick={() => removeDocument(doc)} title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
