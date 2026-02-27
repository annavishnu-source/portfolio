import React from 'react'
// ── Formatting helpers ────────────────────────────────────────────────────────
export const fmt = (n) =>
  n == null || n === '' ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const fmtPct = (n) => (n == null || n === '' ? '—' : `${n}%`)

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const fmtFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Lease status helpers ──────────────────────────────────────────────────────
export function getLeaseStatus(lease) {
  if (lease.status === 'terminated') return 'terminated'
  const today = new Date()
  const end   = new Date(lease.lease_end)
  const start = new Date(lease.lease_start)
  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  if (today < start) return 'upcoming'
  if (daysLeft < 0)  return 'expired'
  if (daysLeft <= 60) return 'expiring'
  return 'active'
}

export const STATUS_LABELS = {
  active: { label: 'Active', color: 'var(--accent)' },
  upcoming: { label: 'Upcoming', color: 'var(--accent-2)' },
  expiring: { label: 'Expiring Soon', color: '#fb923c' },
  expired: { label: 'Expired', color: 'var(--danger)' },
  terminated: { label: 'Terminated', color: 'var(--text-muted)' },
}

// ── Doc type labels ───────────────────────────────────────────────────────────
export const DOC_TYPES = [
  { value: 'lease',      label: 'Lease Agreement' },
  { value: 'addendum',   label: 'Addendum' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'insurance',  label: 'Insurance' },
  { value: 'tax',        label: 'Tax Document' },
  { value: 'deed',       label: 'Deed' },
  { value: 'hoa',        label: 'HOA Document' },
  { value: 'other',      label: 'Other' },
]

// ── Noise overlay ─────────────────────────────────────────────────────────────
export function Noise() {
  return <div className="noise" aria-hidden="true" />
}

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 24 }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.active
  return <span className="status-badge" style={{ '--status-color': s.color }}>{s.label}</span>
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-dialog">
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Realtime indicator ────────────────────────────────────────────────────────
export function RealtimeDot({ active }) {
  return (
    <span className="realtime-dot" title={active ? 'Realtime connected' : 'Connecting...'}>
      <span className={`dot ${active ? 'active' : ''}`} />
      {active ? 'Live' : 'Connecting'}
    </span>
  )
}
