import React from 'react'
import { useState } from 'react'

const EMPTY = {
  address: '', purchasePrice: '', loanProvider: '', interestRate: '',
  mortgageBalance: '', ownershipPct: '', mortgageUsername: '',
  hoaPortalUrl: '', hoaUsername: '', hoaDues: '',
  titleLegalEntity: '', currentRent: '', status: 'active',
}

const FIELDS = [
  { section: 'Property Details', fields: [
    { key: 'address',          label: 'Property Address',      type: 'text',   placeholder: '123 Main St, City, State ZIP', full: true },
    { key: 'purchasePrice',    label: 'Purchase Price',        type: 'number', placeholder: '450000' },
    { key: 'ownershipPct',     label: 'Ownership %',           type: 'number', placeholder: '100' },
    { key: 'titleLegalEntity', label: 'Title / Legal Entity',  type: 'text',   placeholder: 'Anna LLC' },
    { key: 'currentRent',      label: 'Current Monthly Rent',  type: 'number', placeholder: '2500' },
  ]},
  { section: 'Mortgage', fields: [
    { key: 'loanProvider',    label: 'Loan Provider',          type: 'text',   placeholder: 'Wells Fargo' },
    { key: 'interestRate',    label: 'Interest Rate (%)',      type: 'number', placeholder: '6.5' },
    { key: 'mortgageBalance', label: 'Mortgage Balance',       type: 'number', placeholder: '380000' },
    { key: 'mortgageUsername',label: 'Mortgage Login Username',type: 'text',   placeholder: 'username@email.com' },
  ]},
  { section: 'HOA', fields: [
    { key: 'hoaPortalUrl', label: 'HOA Portal URL',      type: 'url',    placeholder: 'https://hoa-portal.com' },
    { key: 'hoaUsername',  label: 'HOA Portal Username', type: 'text',   placeholder: 'username' },
    { key: 'hoaDues',      label: 'Monthly HOA Dues',    type: 'number', placeholder: '350' },
  ]},
]

export function PropertyModal({ property, onSave, onClose }) {
  const isEdit = !!property?.id
  const [form, setForm]     = useState(property ? { ...EMPTY, ...property } : EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const validate = () => {
    const e = {}
    if (!form.address.trim()) e.address = 'Address is required'
    if (!form.purchasePrice)  e.purchasePrice = 'Purchase price is required'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Real Estate</span>
            <h2 className="modal-title">{isEdit ? 'Edit Property' : 'New Property'}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <div className="modal-scroll">
            {FIELDS.map(({ section, fields }) => (
              <div key={section} className="form-section">
                <h3 className="form-section-title">{section}</h3>
                <div className="form-grid">
                  {fields.map(f => (
                    <div key={f.key} className={`form-group ${f.full ? 'full' : ''}`}>
                      <label className="form-label" htmlFor={f.key}>
                        {f.label}
                        {(f.key === 'address' || f.key === 'purchasePrice') && <span className="required">*</span>}
                      </label>
                      <input
                        id={f.key} type={f.type} placeholder={f.placeholder}
                        value={form[f.key] ?? ''}
                        onChange={e => set(f.key, e.target.value)}
                        className={`form-input ${errors[f.key] ? 'error' : ''}`}
                        step={f.type === 'number' ? 'any' : undefined}
                      />
                      {errors[f.key] && <span className="form-error">{errors[f.key]}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
