import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowDownUp, LoaderCircle, MoreHorizontal, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import PageSection from '../components/PageSection'
import { createResource, deleteResource, fetchInventorySummary, fetchResources, updateResource } from '../services/api'
import { formatCurrency } from '../data/mockData'

function ResourceDialog({ initial, onClose, onSave, saving, error }) {
  const [form, setForm] = useState(initial || {
    name: '', category: 'Critical care', cost: '', priority: '',
    current_stock: '0', minimum_stock: '0', location: '',
  })
  const [validationError, setValidationError] = useState('')
  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setValidationError('')
  }

  const submit = (event) => {
    event.preventDefault()
    const currentStock = Number(form.current_stock)
    const minimumStock = Number(form.minimum_stock)
    if (!Number.isSafeInteger(currentStock) || currentStock < 0 ||
        !Number.isSafeInteger(minimumStock) || minimumStock < 0) {
      setValidationError('Current stock and minimum stock must be non-negative whole numbers.')
      return
    }
    const resource = {
      ...form,
      cost: Number(form.cost),
      priority: Number(form.priority),
      current_stock: currentStock,
      minimum_stock: minimumStock,
      // Keep the legacy quantity field synchronized for older API clients.
      quantity: currentStock,
    }
    if (initial) resource.id = initial.id
    onSave(resource)
  }

  const formError = validationError || error
  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title">
      <div className="modal-heading"><div><span className="eyebrow">INVENTORY MANAGEMENT</span><h2 id="resource-modal-title">{initial ? 'Edit resource' : 'Add a resource'}</h2><p>Enter the details for this medical resource.</p></div><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
      <form onSubmit={submit} className="resource-form">
        <label>Resource name<input autoFocus name="name" required value={form.name} onChange={update} placeholder="e.g. Portable ventilator" /></label>
        <div className="form-row">
          <label>Category<select name="category" value={form.category} onChange={update}>{['Critical care', 'Emergency', 'Monitoring', 'Diagnostics', 'Respiratory', 'Renal care'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Cost (₹)<input name="cost" type="number" required min="0" value={form.cost} onChange={update} placeholder="0" /></label>
        </div>
        <div className="form-row">
          <label>Priority score<input name="priority" type="number" min="0" max="100" required value={form.priority} onChange={update} placeholder="0–100" /></label>
          <label>Current stock (units)<input name="current_stock" type="number" min="0" step="1" required value={form.current_stock} onChange={update} placeholder="0" /></label>
        </div>
        <div className="form-row">
          <label>Minimum stock (units)<input name="minimum_stock" type="number" min="0" step="1" required value={form.minimum_stock} onChange={update} placeholder="0" /><small>Shortage is flagged below this threshold.</small></label>
          <label>Location<input name="location" required value={form.location} onChange={update} placeholder="e.g. Intensive care unit" /></label>
        </div>
        {formError && <div className="inventory-error form-error" role="alert"><AlertCircle size={15} /><span>{formError}</span></div>}
        <div className="modal-actions"><button type="button" className="button-outline" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>{saving ? <><LoaderCircle className="api-spin" size={15} /> Saving...</> : <>{initial ? 'Save changes' : 'Add resource'} <Plus size={15} /></>}</button></div>
      </form>
    </section>
  </div>
}

function deriveSummary(items) {
  return {
    total_resource_types: items.length,
    total_units_in_stock: items.reduce((sum, item) => sum + item.current_stock, 0),
    low_stock_resource_count: items.filter((item) => item.stock_status === 'Low Stock').length,
    total_shortage_units: items.reduce((sum, item) => sum + item.shortage_quantity, 0),
  }
}

export default function Inventory() {
  const [items, setItems] = useState([])
  const [inventorySummary, setInventorySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [status, setStatus] = useState('All status')
  const [stockFilter, setStockFilter] = useState('All stock')
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')

  const loadResources = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchResources()
      setItems(data)
      try {
        setInventorySummary(await fetchInventorySummary())
      } catch {
        // Resource CRUD remains usable if the optional summary request fails.
        setInventorySummary(null)
      }
    } catch (error) {
      setLoadError(error.message || 'Could not load the inventory. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadResources() }, [loadResources])

  const categories = ['All categories', ...new Set(items.map((item) => item.category))]
  const summary = inventorySummary || deriveSummary(items)
  const filtered = useMemo(() => items.filter((item) => {
    const matchesQuery = `${item.name} ${item.id} ${item.category}`.toLowerCase().includes(query.toLowerCase())
    const matchesStock = stockFilter === 'All stock' || item.stock_status === stockFilter
    return matchesQuery && matchesStock &&
      (category === 'All categories' || item.category === category) &&
      (status === 'All status' || item.status === status)
  }), [items, query, category, status, stockFilter])

  const refreshSummary = async () => {
    try {
      setInventorySummary(await fetchInventorySummary())
    } catch {
      setInventorySummary(null)
    }
  }

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
      void refreshSummary()
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
      void refreshSummary()
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
    {!loading && !loadError && <div className="stock-overview" aria-label="Inventory stock summary"><div><span>Total resource types</span><strong>{summary.total_resource_types}</strong></div><div><span>Units in stock</span><strong>{summary.total_units_in_stock}</strong></div><div className={summary.low_stock_resource_count ? 'has-shortage' : ''}><span>Low-stock resources</span><strong>{summary.low_stock_resource_count}</strong></div><div className={summary.total_shortage_units ? 'has-shortage' : ''}><span>Shortage units</span><strong>{summary.total_shortage_units}</strong></div></div>}
    {notice && <div className="toast-message" role="status">{notice}</div>}
    {actionError && !dialog && <div className="inventory-error" role="alert"><AlertCircle size={16} /><span>{actionError}</span></div>}
    <PageSection title="Resource catalog" description="Search, review, and update your facility inventory" action={<span className="muted-caption">SQLite · live API</span>}>
      <div className="inventory-controls">
        <label className="search-field"><Search size={17} /><input aria-label="Search resources" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID or category..." disabled={loading || Boolean(loadError)} /><span className="search-shortcut">⌘ K</span></label>
        <div className="filter-controls">
          <label className="filter-select"><SlidersHorizontal size={15} /><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} disabled={loading || Boolean(loadError)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="filter-select"><select aria-label="Filter by resource status" value={status} onChange={(event) => setStatus(event.target.value)} disabled={loading || Boolean(loadError)}>{['All status', 'Available', 'Allocated', 'Maintenance'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="filter-select"><select aria-label="Filter by stock level" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} disabled={loading || Boolean(loadError)}>{['All stock', 'Low Stock', 'Sufficient'].map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
      </div>
      {loading ? <div className="inventory-loading" role="status"><LoaderCircle size={20} className="api-spin" /><span>Loading medical resources…</span></div>
        : loadError ? <div className="inventory-load-error" role="alert"><AlertCircle size={20} /><strong>Couldn’t load the inventory</strong><span>{loadError}</span><button className="button-outline" onClick={loadResources}><RefreshCw size={14} /> Retry connection</button></div>
          : <><div className="table-wrap"><table className="data-table inventory-stock-table"><thead><tr><th><label className="checkbox-wrap"><input type="checkbox" aria-label="Select all visible resources" /><span /></label></th><th>RESOURCE <ArrowDownUp size={12} /></th><th>CATEGORY</th><th>UNIT COST</th><th>PRIORITY SCORE</th><th>CURRENT STOCK</th><th>MINIMUM</th><th>SHORTAGE</th><th>STOCK LEVEL</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className={item.stock_status === 'Low Stock' ? 'low-stock-row' : ''}><td><label className="checkbox-wrap"><input type="checkbox" aria-label={`Select ${item.name}`} /><span /></label></td><td><div className="resource-name-cell"><span className={`resource-glyph glyph-${item.category.toLowerCase().split(' ')[0]}`}>{item.name.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.id} · {item.location}</small></span></div></td><td><span className="category-chip">{item.category}</span></td><td className="currency-cell">{formatCurrency(item.cost)}</td><td><div className="priority-cell"><div className="priority-track"><i style={{ width: `${item.priority}%` }} /></div><strong>{item.priority}</strong></div></td><td>{item.current_stock} units</td><td>{item.minimum_stock} units</td><td><strong className={item.shortage_quantity > 0 ? 'shortage-value' : 'stock-zero'}>{item.shortage_quantity}</strong></td><td><span className={`stock-level-tag ${item.stock_status === 'Low Stock' ? 'stock-level-low' : 'stock-level-sufficient'}`}>{item.stock_status === 'Low Stock' && <AlertCircle size={12} />}{item.stock_status}</span></td><td><span className={`status-tag ${item.status === 'Available' ? 'status-ready' : item.status === 'Allocated' ? 'status-allocated' : 'status-maintenance'}`}><i />{item.status}</span></td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${item.name}`} onClick={() => { setActionError(''); setDialog({ initial: item }) }}><Pencil size={15} /></button><button className="icon-button delete-action" aria-label={`Delete ${item.name}`} disabled={deletingId === item.id} onClick={() => remove(item)}><Trash2 size={15} /></button><button className="icon-button" aria-label={`More actions for ${item.name}`}><MoreHorizontal size={17} /></button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={25} /><strong>No matching resources</strong><span>Try another name or adjust your filters.</span></div>}</div><div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of <strong>{items.length}</strong> resources</span><div className="pagination"><button className="button-outline" disabled>Previous</button><button className="page-number active">1</button><button className="page-number" disabled>2</button><button className="button-outline" disabled>Next</button></div></div></>}
    </PageSection>
    {dialog && <ResourceDialog initial={dialog.initial} onClose={() => setDialog(null)} onSave={save} saving={saving} error={actionError} />}
  </div>
}
