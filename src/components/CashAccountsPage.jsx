import React, { useState, useEffect } from 'react'
import { useCashAccounts, useTransactions, useCategories } from '../hooks/useCashAccounts'
import { fmt, fmtDate, Spinner } from './shared'
import './CashAccounts.css'

// ── Owner config ──────────────────────────────────────────────────────────────
const OWNERS = [
  { id: 'Sai',   label: 'Sai',   emoji: '👤' },
  { id: 'Wife',  label: 'Wife',  emoji: '👤' },
  { id: 'Joint', label: 'Joint', emoji: '👫' },
]

const ACCOUNT_TYPE_LABELS = {
  checking:   { label: 'Checking',   icon: '🏦' },
  savings:    { label: 'Savings',    icon: '🏦' },
  credit:     { label: 'Credit',     icon: '💳' },
  investment: { label: 'Investment', icon: '📈' },
  loan:       { label: 'Loan',       icon: '📋' },
  other:      { label: 'Other',      icon: '💰' },
}

// ── SimpleFIN Setup ───────────────────────────────────────────────────────────
function SimpleFinSetup({ onSave }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave(token.trim())
    } catch (err) {
      setError(err.message || 'Failed to connect SimpleFIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="simplefin-setup">
      <div className="setup-icon">🏦</div>
      <h3 className="setup-title">Connect Your Bank Accounts</h3>
      <p className="setup-desc">
        AnnaVault uses SimpleFIN to securely fetch your bank balances and transactions.
        Your bank credentials are never stored in AnnaVault.
      </p>
      <ol className="setup-steps">
        <li>Go to <a href="https://bridge.simplefin.org" target="_blank" rel="noreferrer">bridge.simplefin.org</a> and create an account</li>
        <li>Add your banks under <strong>Financial Institutions</strong></li>
        <li>Go to <strong>Apps → New Connection</strong> and create a Setup Token</li>
        <li>Paste the Setup Token below</li>
      </ol>
      <form className="setup-form" onSubmit={handleSubmit}>
        <textarea
          className="setup-token-input"
          placeholder="Paste your SimpleFIN Setup Token here..."
          value={token}
          onChange={e => setToken(e.target.value)}
          rows={3}
          required
        />
        {error && <div className="setup-error">{error}</div>}
        <button type="submit" className="btn-save" disabled={loading || !token.trim()}>
          {loading ? <><Spinner size={14} /> Connecting…</> : 'Connect SimpleFIN'}
        </button>
      </form>
    </div>
  )
}

// ── Account Card ──────────────────────────────────────────────────────────────
function AccountCard({ account, onEdit, onSelect, selected }) {
  const typeInfo = ACCOUNT_TYPE_LABELS[account.account_type] || ACCOUNT_TYPE_LABELS.other
  const isCredit = account.account_type === 'credit'
  const balanceColor = isCredit
    ? (account.balance < 0 ? 'balance-negative' : 'balance-positive')
    : (account.balance >= 0 ? 'balance-positive' : 'balance-negative')

  return (
    <div
      className={`account-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(account)}
    >
      <div className="account-card-header">
        <div className="account-type-icon">{typeInfo.icon}</div>
        <div className="account-owner-badge">{account.owner}</div>
      </div>
      <div className="account-institution">{account.institution || 'Bank'}</div>
      <div className="account-name">{account.name}</div>
      <div className={`account-balance ${balanceColor}`}>
        {fmt(Math.abs(account.balance))}
        {isCredit && account.balance < 0 && <span className="balance-label"> owed</span>}
      </div>
      <div className="account-footer">
        <span className="account-type-label">{typeInfo.label}</span>
        {account.balance_date && (
          <span className="account-sync-date">
            {new Date(account.balance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      <button
        className="account-edit-btn"
        onClick={e => { e.stopPropagation(); onEdit(account) }}
        title="Edit"
      >⚙</button>
    </div>
  )
}

// ── Account Edit Modal ────────────────────────────────────────────────────────
function AccountEditModal({ account, onSave, onClose }) {
  const [form, setForm] = useState({
    owner: account.owner || 'Joint',
    account_type: account.account_type || 'checking',
    display_order: account.display_order || 0,
    is_active: account.is_active !== false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await onSave(account.id, form) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Account</span>
            <h2 className="modal-title">{account.name}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-scroll">
            <div className="form-section">
              <h3 className="form-section-title">Settings</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Owner</label>
                  <select className="form-input" value={form.owner} onChange={e => set('owner', e.target.value)}>
                    {OWNERS.map(o => <option key={o.id} value={o.id}>{o.emoji} {o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <select className="form-input" value={form.account_type} onChange={e => set('account_type', e.target.value)}>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input type="number" className="form-input" value={form.display_order}
                    onChange={e => set('display_order', parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Active</label>
                  <select className="form-input" value={form.is_active ? 'true' : 'false'}
                    onChange={e => set('is_active', e.target.value === 'true')}>
                    <option value="true">✅ Active</option>
                    <option value="false">🚫 Hidden</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function TransactionRow({ txn, categories, onCategoryChange }) {
  const [showCatPicker, setShowCatPicker] = useState(false)
  const isDebit  = txn.amount < 0
  const catIcon  = txn.categories?.icon || '📦'
  const catName  = txn.category_name || 'Uncategorized'
  const catColor = txn.categories?.color || '#6b7280'

  // Group categories by parent
  const grouped = categories.reduce((acc, cat) => {
    const parent = cat.parent || 'Other'
    if (!acc[parent]) acc[parent] = []
    acc[parent].push(cat)
    return acc
  }, {})

  return (
    <div className="txn-row">
      <div className="txn-main">
        <div className="txn-left">
          <button
            className="txn-category-pill"
            style={{ '--cat-color': catColor }}
            onClick={() => setShowCatPicker(s => !s)}
            title="Change category"
          >
            <span>{catIcon}</span>
            <span className="txn-cat-name">{catName}</span>
            {txn.user_override && <span className="txn-override-dot" title="Manually set" />}
          </button>
          <div className="txn-desc-block">
            <span className="txn-desc">{txn.description || 'Transaction'}</span>
            {txn.memo && <span className="txn-memo">{txn.memo}</span>}
          </div>
        </div>
        <div className="txn-right">
          <span className={`txn-amount ${isDebit ? 'debit' : 'credit'}`}>
            {isDebit ? '−' : '+'}{fmt(Math.abs(txn.amount))}
          </span>
          <span className="txn-date">{fmtDate(txn.posted_date)}</span>
        </div>
      </div>

      {showCatPicker && (
        <div className="cat-picker">
          {Object.entries(grouped).map(([parent, cats]) => (
            <div key={parent} className="cat-group">
              <div className="cat-group-label">{parent}</div>
              <div className="cat-group-items">
                {cats.map(cat => (
                  <button
                    key={cat.id}
                    className={`cat-option ${txn.category_id === cat.id ? 'selected' : ''}`}
                    onClick={() => {
                      onCategoryChange(txn.id, cat.id, cat.name)
                      setShowCatPicker(false)
                    }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Transaction Panel ─────────────────────────────────────────────────────────
function TransactionPanel({ account, onClose }) {
  const { transactions, loading, categorizing, updateCategory, runAICategorization } = useTransactions(account.id)
  const categories = useCategories()
  const { syncTransactions } = useCashAccounts()
  const [syncing, setSyncing]   = useState(false)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [days, setDays]         = useState(30)

  const handleSync = async () => {
    setSyncing(true)
    try { await syncTransactions(account.simplefin_id, days) }
    finally { setSyncing(false) }
  }

  const filtered = transactions.filter(t => {
    if (filter !== 'all' && t.category_name !== filter) return false
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Summary stats
  const debits  = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const credits = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)

  // Unique categories for filter
  const usedCategories = [...new Set(transactions.map(t => t.category_name).filter(Boolean))]

  return (
    <div className="txn-panel">
      <div className="txn-panel-header">
        <div className="txn-panel-title-block">
          <button className="txn-back-btn" onClick={onClose}>← Back</button>
          <div>
            <h3 className="txn-panel-title">{account.name}</h3>
            <span className="txn-panel-inst">{account.institution}</span>
          </div>
        </div>
        <div className="txn-panel-balance">{fmt(account.balance)}</div>
      </div>

      {/* Stats */}
      <div className="txn-stats">
        <div className="txn-stat">
          <span className="txn-stat-label">Spending</span>
          <span className="txn-stat-value debit">{fmt(debits)}</span>
        </div>
        <div className="txn-stat">
          <span className="txn-stat-label">Income</span>
          <span className="txn-stat-value credit">{fmt(credits)}</span>
        </div>
        <div className="txn-stat">
          <span className="txn-stat-label">Transactions</span>
          <span className="txn-stat-value">{transactions.length}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="txn-controls">
        <input
          className="txn-search"
          placeholder="Search transactions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="txn-filter form-input compact"
          value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="txn-days form-input compact"
          value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
        </select>
        <button className="btn-sync-txn" onClick={handleSync} disabled={syncing}>
          {syncing ? <Spinner size={13} /> : '↻'} Sync
        </button>
        <button className="btn-ai-cat" onClick={runAICategorization} disabled={categorizing}>
          {categorizing ? <Spinner size={13} /> : '✦'} AI Categorize
        </button>
      </div>

      {/* Transactions */}
      <div className="txn-list">
        {loading ? (
          <div className="txn-loading"><Spinner size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="txn-empty">
            {transactions.length === 0
              ? 'No transactions yet. Click Sync to load them.'
              : 'No transactions match your filter.'}
          </div>
        ) : (
          filtered.map(txn => (
            <TransactionRow
              key={txn.id}
              txn={txn}
              categories={categories}
              onCategoryChange={updateCategory}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Cash Accounts Page ────────────────────────────────────────────────────────
export default function CashAccountsPage() {
  const {
    accounts, loading, syncing, lastSynced,
    syncBalances, updateAccount, saveSimpleFinToken, hasConfig
  } = useCashAccounts()

  const [configured, setConfigured]   = useState(null) // null = checking
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [editingAccount, setEditingAccount]   = useState(null)

  useEffect(() => {
    hasConfig().then(setConfigured)
  }, [])

  const handleTokenSave = async (token) => {
    await saveSimpleFinToken(token)
    setConfigured(true)
  }

  // Group accounts by owner
  const grouped = OWNERS.reduce((acc, owner) => {
    acc[owner.id] = accounts.filter(a => a.owner === owner.id)
    return acc
  }, {})

  // Summary totals
  const totalAssets = accounts
    .filter(a => a.account_type !== 'credit' && a.account_type !== 'loan')
    .reduce((s, a) => s + (Number(a.balance) || 0), 0)
  const totalDebt = accounts
    .filter(a => a.account_type === 'credit' || a.account_type === 'loan')
    .reduce((s, a) => s + Math.abs(Number(a.balance) || 0), 0)

  if (configured === null) return <div className="page-loading"><Spinner /></div>

  if (!configured) return <SimpleFinSetup onSave={handleTokenSave} />

  if (selectedAccount) {
    return (
      <TransactionPanel
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
      />
    )
  }

  return (
    <div className="cash-page">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-heading"><em>Cash</em> Accounts</h2>
          <span className="section-count">{accounts.length} accounts</span>
        </div>
        <div className="cash-header-actions">
          {lastSynced && (
            <span className="last-synced">
              Synced {new Date(lastSynced).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button className="btn-sync" onClick={syncBalances} disabled={syncing}>
            {syncing ? <><Spinner size={13} /> Syncing…</> : '↻ Sync Balances'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {accounts.length > 0 && (
        <div className="summary-bar" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="summary-card">
            <span className="summary-label">Total Accounts</span>
            <span className="summary-value">{accounts.length}</span>
          </div>
          <div className="summary-card highlight">
            <span className="summary-label">Total Cash Assets</span>
            <span className="summary-value">{fmt(totalAssets)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total Debt</span>
            <span className="summary-value" style={{ color: 'var(--danger)' }}>{fmt(totalDebt)}</span>
          </div>
        </div>
      )}

      {/* Accounts grouped by owner */}
      {loading ? (
        <div className="page-loading"><Spinner size={32} /></div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <h3 className="empty-title">No accounts yet</h3>
          <p className="empty-sub">Click "Sync Balances" to fetch your accounts from SimpleFIN.</p>
          <button className="btn-add large" onClick={syncBalances} disabled={syncing}>
            {syncing ? 'Syncing…' : '↻ Sync Now'}
          </button>
        </div>
      ) : (
        OWNERS.map(owner => grouped[owner.id]?.length > 0 && (
          <div key={owner.id} className="owner-section">
            <div className="owner-section-header">
              <span className="owner-label">{owner.emoji} {owner.label}</span>
              <span className="owner-total">
                {fmt(grouped[owner.id].reduce((s, a) => s + (Number(a.balance) || 0), 0))}
              </span>
            </div>
            <div className="accounts-grid">
              {grouped[owner.id].map(acct => (
                <AccountCard
                  key={acct.id}
                  account={acct}
                  selected={selectedAccount?.id === acct.id}
                  onSelect={setSelectedAccount}
                  onEdit={setEditingAccount}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {editingAccount && (
        <AccountEditModal
          account={editingAccount}
          onSave={async (id, data) => { await updateAccount(id, data); setEditingAccount(null) }}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </div>
  )
}
