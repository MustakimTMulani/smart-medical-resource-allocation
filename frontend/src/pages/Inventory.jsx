import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Plus, MoreHorizontal, Pencil, Trash2, ArrowDownUp, X, RefreshCw, LoaderCircle, AlertCircle } from 'lucide-react'
import PageSection from '../components/PageSection'
import { createResource, deleteResource, fetchResources, updateResource } from '../services/api'
import { formatCurrency } from '../data/mockData'

function ResourceDialog({ initial, onClose, onSave, saving, error }) {
  const [form, setForm] = useState(initial || { name: '', category: 'Critical care', cost: '', priority: '', quantity: '', location: '' })
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = (event) => {
    event.preventDefault()
    const resource = { ...form, cost: Number(form.cost), priority: Number(form.priority), quantity: Number(form.quantity) }
    if (initial) resource.id = initial.id
    onSave(resource)
  }
  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title"><div className="modal-heading"><div><span className="eyebrow">INVENTORY MANAGEMENT</span><h2 id="resource-modal-title">{initial ? 'Edit resource' : 'Add a resource'}</h2><p>Enter the details for this medical resource.</p></div><button className="icon-button" disabled={saving} onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={submit} className="resource-form"><label>Resource name<input autoFocus name="name" required value={form.name} onChange={update} placeholder="e.g. Portable ventilator" /></label><div className="form-row"><label>Category<select name="category" value={form.category} onChange={update}>{['Critical care', 'Emergency', 'Monitoring', 'Diagnostics', 'Respiratory', 'Renal care'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Cost (₹)<input name="cost" type="number" required min="0" value={form.cost} onChange={update} placeholder="0" /></label></div><div className="form-row"><label>Priority score<input name="priority" type="number" min="0" max="100" required value={form.priority} onChange={update} placeholder="0–100" /></label><label>Quantity<input name="quantity" type="number" min="0" required value={form.quantity} onChange={update} placeholder="0" /></label></div><label>Location<input name="location" required value={form.location} onChange={update} placeholder="e.g. Intensive care unit" /></label>{error && <div className="inventory-error form-error" role="alert"><AlertCircle size={15} /><span>{error}</span></div>}<div className="modal-actions"><button type="button" className="button-outline" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>{saving ? <><LoaderCircle className="api-spin" size={15} /> Saving...</> : <>{initial ? 'Save changes' : 'Add resource'} <Plus size={15} /></>}</button></div></form></section></div>
}

export default function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [status, setStatus] = useState('All status')
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')

  const loadResources = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchResources()
      setItems(data)
    } catch (error) {
      setLoadError(error.message || 'Could not load the inventory. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadResources() }, [loadResources])

  const categories = ['All categories', ...new Set(items.map((item) => item.category))]
  const filtered = useMemo(() => items.filter((item) => {
    const matchesQuery = `${item.name} ${item.id} ${item.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (category === 'All categories' || item.category === category) && (status === 'All status' || item.status === status)
  }), [items, query, category, status])

  const save = async (resource) => {
    setSaving(true)
    setActionError('')
    try {
      const saved = dialog?.initial
        ? await updateResource(dialog.initial.id, resource)
        : await createResource(resource)
      setItems((current) => dialog?.initial
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current])
      setNotice(dialog?.initial ? 'Resource details updated.' : 'Resource added to inventory.')
      setDialog(null)
      window.setTimeout(() => setNotice(''), 2800)
    } catch (error) {
      setActionError(error.message || 'Could not save this resource. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    setDeletingId(item.id)
    setActionError('')
    try {
      await deleteResource(item.id)
      setItems((current) => current.filter((row) => row.id !== item.id))
      setNotice(`${item.name} removed from inventory.`)
      window.setTimeout(() => setNotice(''), 2800)
    } catch (error) {
      setActionError(error.message || `Could not delete ${item.name}. Please try again.`)
    } finally {
      setDeletingId(null)
    }
  }

  return <div className="page-stack">
    <div className="page-toolbar"><div className="toolbar-stat"><span className="toolbar-stat-icon"><SlidersHorizontal size={17} /></span><div><strong>{loading ? 'Loading inventory…' : `${items.length} resources`}</strong><small>{loading ? 'Connecting to the inventory API' : `Across ${new Set(items.map((item) => item.category)).size} categories`}</small></div></div><button className="button-primary" onClick={() => { setActionError(''); setDialog({ initial: null }) }} disabled={loading || Boolean(loadError)}><Plus size={16} /> Add resource</button></div>
    {notice && <div className="toast-message" role="status">{notice}</div>}
    {actionError && !dialog && <div className="inventory-error" role="alert"><AlertCircle size={16} /><span>{actionError}</span></div>}
    <PageSection title="Resource catalog" description="Search, review, and update your facility inventory" action={<span className="muted-caption">SQLite · live API</span>}>
      <div className="inventory-controls"><label className="search-field"><Search size={17} /><input aria-label="Search resources" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID or category..." disabled={loading || Boolean(loadError)} /><span className="search-shortcut">⌘ K</span></label><div className="filter-controls"><label className="filter-select"><SlidersHorizontal size={15} /><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} disabled={loading || Boolean(loadError)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="filter-select"><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} disabled={loading || Boolean(loadError)}>{['All status', 'Available', 'Allocated', 'Maintenance'].map((value) => <option key={value}>{value}</option>)}</select></label></div></div>
      {loading ? <div className="inventory-loading" role="status"><LoaderCircle size={20} className="api-spin" /><span>Loading medical resources…</span></div> : loadError ? <div className="inventory-load-error" role="alert"><AlertCircle size={20} /><strong>Couldn’t load the inventory</strong><span>{loadError}</span><button className="button-outline" onClick={loadResources}><RefreshCw size={14} /> Retry connection</button></div> : <><div className="table-wrap"><table className="data-table"><thead><tr><th><label className="checkbox-wrap"><input type="checkbox" aria-label="Select all visible resources" /><span /></label></th><th>RESOURCE <ArrowDownUp size={12} /></th><th>CATEGORY</th><th>UNIT COST</th><th>PRIORITY SCORE</th><th>QUANTITY</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><label className="checkbox-wrap"><input type="checkbox" aria-label={`Select ${item.name}`} /><span /></label></td><td><div className="resource-name-cell"><span className={`resource-glyph glyph-${item.category.toLowerCase().split(' ')[0]}`}>{item.name.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.id} · {item.location}</small></span></div></td><td><span className="category-chip">{item.category}</span></td><td className="currency-cell">{formatCurrency(item.cost)}</td><td><div className="priority-cell"><div className="priority-track"><i style={{ width: `${item.priority}%` }} /></div><strong>{item.priority}</strong></div></td><td>{item.quantity} units</td><td><span className={`status-tag ${item.status === 'Available' ? 'status-ready' : item.status === 'Allocated' ? 'status-allocated' : 'status-maintenance'}`}><i />{item.status}</span></td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${item.name}`} onClick={() => { setActionError(''); setDialog({ initial: item }) }}><Pencil size={15} /></button><button className="icon-button delete-action" aria-label={`Delete ${item.name}`} disabled={deletingId === item.id} onClick={() => remove(item)}><Trash2 size={15} /></button><button className="icon-button" aria-label={`More actions for ${item.name}`}><MoreHorizontal size={17} /></button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={25} /><strong>No matching resources</strong><span>Try another name or clear your filters.</span></div>}</div><div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of <strong>{items.length}</strong> resources</span><div className="pagination"><button className="button-outline" disabled>Previous</button><button className="page-number active">1</button><button className="page-number" disabled>2</button><button className="button-outline" disabled>Next</button></div></div></>}
    </PageSection>
    {dialog && <ResourceDialog initial={dialog.initial} onClose={() => setDialog(null)} onSave={save} saving={saving} error={actionError} />}
  </div>
}
