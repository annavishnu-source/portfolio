import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useProperties, fromDb } from './hooks/useProperties'
import { useLeases, leaseFromDb } from './hooks/useLeases'
import { PropertyModal } from './components/PropertyModal'
import { LeaseModal } from './components/LeaseModal'
import { DocumentPanel } from './components/DocumentPanel'
import { Noise, Spinner, StatusBadge, ConfirmDialog, RealtimeDot, fmt, fmtPct, fmtDate, getLeaseStatus } from './components/shared'
import './App.css'

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ onAddProperty, realtimeActive }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h)
  }, [])
  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-inner">
        <div className="logo">
          <img src="/logo.svg" alt="AnnaVault" className="logo-img" />
          <div className="logo-text">
            <span className="logo-name">AnnaVault</span>
            <span className="logo-tagline">Where Wealth Takes Root</span>
          </div>
        </div>
        <div className="header-right">
          <RealtimeDot active={realtimeActive} />
          <span className="header-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button className="btn-add" onClick={onAddProperty}>
            <span>+</span> Add Property
          </button>
        </div>
      </div>
    </header>
  )
}

// ── Summary Bar ───────────────────────────────────────────────────────────────
function SummaryBar({ properties }) {
  const totalValue  = properties.reduce((s, p) => s + (Number(p.purchasePrice) || 0), 0)
  const totalDebt   = properties.reduce((s, p) => s + (Number(p.mortgageBalance) || 0), 0)
  const totalEquity = totalValue - totalDebt
  const totalRent   = properties.reduce((s, p) => s + (Number(p.currentRent) || 0), 0)
  return (
    <div className="summary-bar">
      {[
        { label: 'Properties',       value: properties.length, raw: true },
        { label: 'Total Asset Value', value: fmt(totalValue) },
        { label: 'Total Equity',      value: fmt(totalEquity), highlight: true },
        { label: 'Monthly Rent',      value: fmt(totalRent) },
      ].map(c => (
        <div key={c.label} className={`summary-card ${c.highlight ? 'highlight' : ''}`}>
          <span className="summary-label">{c.label}</span>
          <span className="summary-value">{c.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Lease Row ─────────────────────────────────────────────────────────────────
function LeaseRow({ lease, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const status = getLeaseStatus(lease)
  return (
    <div className="lease-row">
      <div className="lease-summary" onClick={() => setExpanded(e => !e)}>
        <StatusBadge status={status} />
        <span className="lease-tenant">{lease.tenant_name}</span>
        <span className="lease-period">{fmtDate(lease.lease_start)} — {fmtDate(lease.lease_end)}</span>
        <span className="lease-rent">{fmt(lease.monthly_rent)}<span className="per-mo">/mo</span></span>
        <div className="lease-actions-inline">
          <button className="btn-icon" onClick={e => { e.stopPropagation(); onEdit(lease) }}>Edit</button>
          <button className="btn-icon danger" onClick={e => { e.stopPropagation(); onDelete(lease.id) }}>Del</button>
        </div>
        <span className="lease-chevron">{expanded ? '−' : '+'}</span>
      </div>
      {expanded && (
        <div className="lease-detail">
          <div className="lease-detail-grid">
            {lease.tenant_email && <span className="ld-item"><span className="ld-label">Email</span>{lease.tenant_email}</span>}
            {lease.tenant_phone && <span className="ld-item"><span className="ld-label">Phone</span>{lease.tenant_phone}</span>}
            {lease.security_deposit && <span className="ld-item"><span className="ld-label">Deposit</span>{fmt(lease.security_deposit)}</span>}
            {lease.rent_due_day && <span className="ld-item"><span className="ld-label">Due Day</span>Day {lease.rent_due_day}</span>}
            {lease.notes && <span className="ld-item full"><span className="ld-label">Notes</span>{lease.notes}</span>}
          </div>
          <DocumentPanel propertyId={lease.property_id} leaseId={lease.id} />
        </div>
      )}
    </div>
  )
}

// ── Property Card ─────────────────────────────────────────────────────────────
function PropertyCard({ property, onEdit, onDelete }) {
  const [expanded, setExpanded]     = useState(false)
  const [activeTab, setActiveTab]   = useState('details')
  const [leaseModal, setLeaseModal] = useState(null)
  const [confirmLease, setConfirmLease] = useState(null)
  const { leases, addLease, updateLease, deleteLease } = useLeases(property.id)

  const equity = (Number(property.purchasePrice) || 0) - (Number(property.mortgageBalance) || 0)
  const activeLeases = leases.filter(l => getLeaseStatus(l) === 'active' || getLeaseStatus(l) === 'expiring')

  const handleSaveLease = async (data) => {
    if (data.id) await updateLease(data.id, data)
    else await addLease(data)
    setLeaseModal(null)
  }

  return (
    <div className={`property-card ${expanded ? 'expanded' : ''}`}>
      {/* Card Header */}
      <div className="card-header" onClick={() => setExpanded(e => !e)}>
        <div className="card-header-left">
          <div className="card-icon">🏠</div>
          <div className="card-title-block">
            <h3 className="card-address">{property.address || 'Unnamed Property'}</h3>
            <span className="card-entity">{property.titleLegalEntity || 'No legal entity'}</span>
          </div>
        </div>
        <div className="card-header-right">
          <div className="card-metrics">
            <Metric label="Value"    value={fmt(property.purchasePrice)} />
            <Metric label="Equity"   value={fmt(equity)}                 accent />
            <Metric label="Rent/mo"  value={fmt(property.currentRent)} />
            <Metric label="Leases"   value={`${activeLeases.length} active`} />
          </div>
          <span className="card-chevron">{expanded ? '−' : '+'}</span>
        </div>
      </div>

      {/* Expanded Body */}
      {expanded && (
        <div className="card-body">
          <div className="card-tabs">
            {['details', 'leases', 'documents'].map(tab => (
              <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'leases' && leases.length > 0 && <span className="tab-badge">{leases.length}</span>}
              </button>
            ))}
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="tab-content">
              <div className="card-sections">
                <DetailSection title="Property">
                  <Detail label="Purchase Price" value={fmt(property.purchasePrice)} />
                  <Detail label="Ownership" value={fmtPct(property.ownershipPct)} />
                  <Detail label="Monthly Rent" value={fmt(property.currentRent)} />
                  <Detail label="Legal Entity" value={property.titleLegalEntity} />
                </DetailSection>
                <DetailSection title="Mortgage">
                  <Detail label="Lender" value={property.loanProvider} />
                  <Detail label="Interest Rate" value={fmtPct(property.interestRate)} />
                  <Detail label="Balance" value={fmt(property.mortgageBalance)} />
                  <Detail label="Login" value={property.mortgageUsername} sensitive />
                </DetailSection>
                <DetailSection title="HOA">
                  <Detail label="Portal" value={property.hoaPortalUrl} isUrl />
                  <Detail label="Username" value={property.hoaUsername} sensitive />
                  <Detail label="Monthly Dues" value={fmt(property.hoaDues)} />
                </DetailSection>
              </div>
              <div className="card-actions">
                <button className="btn-edit" onClick={() => onEdit(property)}>Edit Property</button>
                <button className="btn-delete" onClick={() => onDelete(property.id)}>Delete</button>
              </div>
            </div>
          )}

          {/* Leases Tab */}
          {activeTab === 'leases' && (
            <div className="tab-content">
              <div className="tab-toolbar">
                <button className="btn-add-small" onClick={() => setLeaseModal('new')}>+ New Lease</button>
              </div>
              {leases.length === 0 ? (
                <p className="tab-empty">No leases added yet.</p>
              ) : (
                <div className="leases-list">
                  {leases.map(l => (
                    <LeaseRow
                      key={l.id} lease={l}
                      onEdit={(lease) => setLeaseModal(lease)}
                      onDelete={(id) => setConfirmLease(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="tab-content">
              <DocumentPanel propertyId={property.id} />
            </div>
          )}
        </div>
      )}

      {leaseModal && (
        <LeaseModal
          propertyId={property.id}
          lease={leaseModal === 'new' ? null : leaseModal}
          onSave={handleSaveLease}
          onClose={() => setLeaseModal(null)}
        />
      )}
      {confirmLease && (
        <ConfirmDialog
          message="Delete this lease? This cannot be undone."
          onConfirm={async () => { await deleteLease(confirmLease); setConfirmLease(null) }}
          onCancel={() => setConfirmLease(null)}
        />
      )}
    </div>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div className="card-metric">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${accent ? 'accent' : ''}`}>{value}</span>
    </div>
  )
}

function DetailSection({ title, children }) {
  return (
    <div className="card-section">
      <h4 className="csection-title">{title}</h4>
      <div className="detail-grid">{children}</div>
    </div>
  )
}

function Detail({ label, value, sensitive, isUrl }) {
  const [shown, setShown] = useState(false)
  const display = value || '—'
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      {sensitive ? (
        <span className="detail-value sensitive" onClick={() => setShown(s => !s)}>
          {shown ? display : (value ? '••••••••' : '—')}
          {value && <span className="show-toggle">{shown ? ' hide' : ' show'}</span>}
        </span>
      ) : isUrl && value ? (
        <a href={value} target="_blank" rel="noreferrer" className="detail-value link">{value}</a>
      ) : (
        <span className="detail-value">{display}</span>
      )}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M30 4L56 17V43L30 56L4 43V17L30 4Z" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" fill="none"/>
          <path d="M30 20L42 26.5V39.5L30 46L18 39.5V26.5L30 20Z" fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth="1"/>
          <path d="M30 28V34M30 24V26" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 className="empty-title">Your vault is empty</h3>
      <p className="empty-sub">Add your first property to start tracking your real estate portfolio.</p>
      <button className="btn-add large" onClick={onAdd}><span>+</span> Add First Property</button>
    </div>
  )
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const { properties: rawProps, loading, error, addProperty, updateProperty, deleteProperty } = useProperties()
  const properties = rawProps.map(fromDb)

  const [propertyModal, setPropertyModal] = useState(null)
  const [confirmId, setConfirmId]         = useState(null)
  const [realtimeActive, setRealtimeActive] = useState(false)

  // Track realtime connection
  useEffect(() => {
    const channel = supabase.channel('system').subscribe(status => {
      setRealtimeActive(status === 'SUBSCRIBED')
    })
    return () => supabase.removeChannel(channel)
  }, [])

  const handleSaveProperty = async (data) => {
    if (data.id) await updateProperty(data.id, data)
    else await addProperty(data)
    setPropertyModal(null)
  }

  if (loading) return (
    <div className="app-loading">
      <Spinner size={36} />
      <p>Loading AnnaVault…</p>
    </div>
  )

  if (error) return (
    <div className="app-loading">
      <p className="error-msg">⚠️ {error}</p>
      <p className="error-hint">Check your Supabase credentials in <code>.env</code></p>
    </div>
  )

  return (
    <>
      <Noise />
      <div className="app-bg" aria-hidden="true" />
      <Header onAddProperty={() => setPropertyModal('new')} realtimeActive={realtimeActive} />
      <main className="main">
        <div className="main-inner">
          {properties.length > 0 && <SummaryBar properties={properties} />}
          <div className="section-header">
            <div className="section-title-block">
              <h2 className="section-heading"><em>Real Estate</em> Portfolio</h2>
              <span className="section-count">{properties.length} {properties.length === 1 ? 'property' : 'properties'}</span>
            </div>
          </div>
          {properties.length === 0
            ? <EmptyState onAdd={() => setPropertyModal('new')} />
            : <div className="properties-list">
                {properties.map(p => (
                  <PropertyCard key={p.id} property={p}
                    onEdit={prop => setPropertyModal(prop)}
                    onDelete={id => setConfirmId(id)}
                  />
                ))}
              </div>
          }
        </div>
      </main>
      <footer className="footer">
        <span>AnnaVault © {new Date().getFullYear()}</span>
        <span>Powered by Supabase · Realtime Enabled</span>
      </footer>

      {propertyModal && (
        <PropertyModal
          property={propertyModal === 'new' ? null : propertyModal}
          onSave={handleSaveProperty}
          onClose={() => setPropertyModal(null)}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          message="Delete this property and all associated data? This cannot be undone."
          onConfirm={async () => { await deleteProperty(confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  )
}
