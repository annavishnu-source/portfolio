import { useState } from 'react'

const EMPTY = {
  tenantName: '', tenantEmail: '', tenantPhone: '',
  leaseStart: '', leaseEnd: '', monthlyRent: '',
  securityDeposit: '', rentDueDay: '1', status: 'active', notes: '',
}

export function LeaseModal({ propertyId, lease, onSave, onClose }) {
  const isEdit = !!lease?.id
  const [form, setForm]     = useState(lease ? { ...EMPTY, ...lease } : { ...EMPTY, propertyId })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const validate = () => {
    const e = {}
    if (!form.tenantName.trim()) e.tenantName = 'Tenant name is required'
    if (!form.leaseStart)        e.leaseStart = 'Start date is required'
    if (!form.leaseEnd)          e.leaseEnd   = 'End date is required'
    if (!form.monthlyRent)       e.monthlyRent = 'Monthly rent is required'
    if (form.leaseStart && form.leaseEnd && form.leaseEnd <= form.leaseStart)
      e.leaseEnd = 'End date must be after start date'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try { await onSave({ ...form, propertyId: propertyId }) }
    finally { setSaving(false) }
  }

  const Field = ({ fkey, label, type = 'text', placeholder, required, half }) => (
    <div className={`form-group ${half ? '' : 'full'}`}>
      <label className="form-label" htmlFor={fkey}>
        {label}{required && <span className="required">*</span>}
      </label>
      <input
        id={fkey} type={type} placeholder={placeholder}
        value={form[fkey] ?? ''}
        onChange={e => set(fkey, e.target.value)}
        className={`form-input ${errors[fkey] ? 'error' : ''}`}
        step={type === 'number' ? 'any' : undefined}
      />
      {errors[fkey] && <span className="form-error">{errors[fkey]}</span>}
    </div>
  )

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Lease</span>
            <h2 className="modal-title">{isEdit ? 'Edit Lease' : 'New Lease'}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <div className="modal-scroll">
            <div className="form-section">
              <h3 className="form-section-title">Tenant Information</h3>
              <div className="form-grid">
                <Field fkey="tenantName"  label="Tenant Name"  required full placeholder="Jane Smith" />
                <Field fkey="tenantEmail" label="Email"   half type="email" placeholder="tenant@email.com" />
                <Field fkey="tenantPhone" label="Phone"   half placeholder="(555) 000-0000" />
              </div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Lease Terms</h3>
              <div className="form-grid">
                <Field fkey="leaseStart"      label="Start Date"        type="date" required half />
                <Field fkey="leaseEnd"        label="End Date"          type="date" required half />
                <Field fkey="monthlyRent"     label="Monthly Rent"      type="number" required half placeholder="2500" />
                <Field fkey="securityDeposit" label="Security Deposit"  type="number" half placeholder="2500" />
                <Field fkey="rentDueDay"      label="Rent Due Day"      type="number" half placeholder="1" />
                <div className="form-group half">
                  <label className="form-label" htmlFor="status">Status</label>
                  <select id="status" className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Notes</h3>
              <div className="form-group full">
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Any additional notes about this lease..."
                  value={form.notes ?? ''}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Lease'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
