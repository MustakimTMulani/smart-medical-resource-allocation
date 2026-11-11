import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, Check, CircleDollarSign, Info, LoaderCircle, PackageCheck, RefreshCw, RotateCcw, ShieldCheck, Wallet } from 'lucide-react'
import PageSection from '../components/PageSection'
import { compareAlgorithms, fetchResources } from '../services/api'
import { formatCurrency } from '../data/mockData'

const initialBudget = '500000'

export default function Allocation({ onComparisonComplete }) {
  const [budgetInput, setBudgetInput] = useState(initialBudget)
  const [resources, setResources] = useState([])
  const [selected, setSelected] = useState([])
  const [loadingResources, setLoadingResources] = useState(true)
  const [resourceError, setResourceError] = useState('')
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonError, setComparisonError] = useState('')
  const [comparisonResponse, setComparisonResponse] = useState(null)

  const loadResources = async () => {
    setLoadingResources(true)
    setResourceError('')
    try {
      const inventory = await fetchResources()
      const availableResources = inventory.filter((item) => item.status === 'Available')
      setResources(availableResources)
      setSelected((current) => current.filter((id) => availableResources.some((item) => item.id === id)))
    } catch (error) {
      setResourceError(error.message || 'Could not load medical resources. Please try again.')
      setResources([])
      setSelected([])
    } finally {
      setLoadingResources(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [])

  const budget = budgetInput === '' ? null : Number(budgetInput)
  const validBudget = Number.isSafeInteger(budget) && budget >= 0
  const chosen = useMemo(() => resources.filter((item) => selected.includes(item.id)), [resources, selected])
  const totalCost = chosen.reduce((sum, item) => sum + item.cost, 0)
  const totalPriority = chosen.reduce((sum, item) => sum + item.priority, 0)
  const remaining = validBudget ? budget - totalCost : 0
  const budgetError = budgetInput !== '' && !validBudget
    ? 'Enter a whole, non-negative budget amount.'
    : validBudget && remaining < 0
      ? 'Selected resource cost exceeds the available budget.'
      : ''

  const clearComparison = () => {
    setComparisonResponse(null)
    setComparisonError('')
    onComparisonComplete?.(null)
  }

  const setBudget = (value) => {
    setBudgetInput(String(value))
    clearComparison()
  }

  const toggle = (id) => {
    clearComparison()
    setSelected((current) => current.includes(id)
      ? current.filter((resourceId) => resourceId !== id)
      : [...current, id])
  }

  const runComparison = async () => {
    if (!validBudget || budgetError || chosen.length === 0) return
    setComparisonLoading(true)
    setComparisonError('')
    setComparisonResponse(null)
    onComparisonComplete?.(null)
    try {
      const result = await compareAlgorithms(chosen, budget)
      setComparisonResponse(result)
      onComparisonComplete?.(result)
    } catch (error) {
      setComparisonError(error.message || 'The algorithm comparison failed. Please try again.')
    } finally {
      setComparisonLoading(false)
    }
  }

  return <div className="page-stack">
    <div className="allocation-banner"><span className="banner-icon"><ShieldCheck size={20} /></span><div><strong>Build a plan that fits your care priorities.</strong><span>Select available resources from the live inventory, then compare them within your budget.</span></div></div>
    <div className="allocation-layout">
      <div className="allocation-main">
        <PageSection title="Set your available budget" description="Enter the maximum spend for this allocation comparison">
          <label className="budget-input-wrap"><span className="currency-prefix">₹</span><input aria-label="Available budget in rupees" type="number" min="0" step="1" inputMode="numeric" value={budgetInput} disabled={comparisonLoading} onChange={(event) => setBudget(event.target.value)} /><span className="budget-currency">INR</span></label>
          {budgetError && <div className="inventory-error form-error" role="alert"><AlertCircle size={15} /><span>{budgetError}</span></div>}
          <div className="budget-quick-picks"><span>Quick set</span>{[250000, 500000, 1000000].map((value) => <button type="button" key={value} disabled={comparisonLoading} className={budget === value ? 'active' : ''} onClick={() => setBudget(value)}>{formatCurrency(value)}</button>)}</div>
        </PageSection>
        <PageSection title="Choose medical resources" description={loadingResources ? 'Loading the inventory from SQLite' : `${resources.length} available resources in the inventory`} action={<button type="button" className="text-action" onClick={() => { setSelected([]); clearComparison() }} disabled={loadingResources || selected.length === 0}><RotateCcw size={14} /> Clear selection</button>}>
          {loadingResources ? <div className="inventory-loading" role="status"><LoaderCircle size={20} className="api-spin" /><span>Loading available medical resources…</span></div>
            : resourceError ? <div className="inventory-load-error" role="alert"><AlertCircle size={20} /><strong>Couldn’t load the inventory</strong><span>{resourceError}</span><button type="button" className="button-outline" onClick={loadResources}><RefreshCw size={14} /> Retry connection</button></div>
              : resources.length === 0 ? <div className="empty-state"><PackageCheck size={25} /><strong>No available resources</strong><span>Resources marked Available will appear here.</span></div>
                : <div className="allocation-resource-list">{resources.map((item) => {
                  const checked = selected.includes(item.id)
                  const fits = checked || (validBudget && totalCost + item.cost <= budget)
                  return <label key={item.id} className={`allocation-resource ${checked ? 'selected' : ''} ${!fits ? 'over-budget' : ''}`}>
                    <input type="checkbox" checked={checked} disabled={!fits || comparisonLoading} onChange={() => toggle(item.id)} />
                    <span className="allocation-checkbox"><Check size={13} /></span>
                    <span className="allocation-resource-copy"><strong>{item.name}</strong><small>{item.id} <i>·</i> Priority {item.priority}</small></span>
                    <span className="resource-inline-priority"><i style={{ width: `${Math.min(item.priority, 100)}%` }} /></span>
                    <strong className="allocation-cost">{formatCurrency(item.cost)}</strong>
                  </label>
                })}</div>}
        </PageSection>
      </div>
      <aside className="allocation-summary">
        <div className="summary-top"><span className="summary-icon"><PackageCheck size={20} /></span><div><span className="eyebrow">ALLOCATION SUMMARY</span><h2>Your plan</h2></div><span className="summary-draft">DRAFT</span></div>
        <div className="summary-budget"><span>Available budget</span><strong>{validBudget ? formatCurrency(budget) : '—'}</strong><div className="summary-progress"><i style={{ width: `${validBudget && budget ? Math.min(totalCost / budget * 100, 100) : 0}%` }} /></div><small>{validBudget && budget ? Math.min(totalCost / budget * 100, 100).toFixed(1) : '0.0'}% budget used</small></div>
        <div className="summary-metrics"><div><span><CircleDollarSign size={15} /> Selected resource cost</span><strong>{formatCurrency(totalCost)}</strong></div><div><span><Wallet size={15} /> Remaining budget</span><strong>{validBudget ? formatCurrency(remaining) : '—'}</strong></div><div><span><ShieldCheck size={15} /> Selected priority total</span><strong>{totalPriority}</strong></div></div>
        <div className="summary-selected"><span>Selected resources <b>{chosen.length}</b></span>{chosen.length ? chosen.map((item) => <div key={item.id}><span>{item.name}</span><strong>{formatCurrency(item.cost)}</strong></div>) : <p>No resources selected yet.</p>}</div>
        <button type="button" className="button-primary full-width" disabled={loadingResources || comparisonLoading || !chosen.length || !validBudget || Boolean(budgetError)} onClick={runComparison}>{comparisonLoading ? <><LoaderCircle size={15} className="api-spin" /> Comparing…</> : comparisonResponse ? <><Check size={16} /> Compare again</> : <>Compare Algorithms <ArrowRight size={16} /></>}</button>
        {comparisonLoading && <div className="inventory-loading comparison-loading" role="status"><LoaderCircle size={16} className="api-spin" /><span>Running the three algorithms…</span></div>}
        {comparisonError && <div className="inventory-error comparison-error" role="alert"><AlertCircle size={15} /><span>{comparisonError}</span></div>}
        {comparisonResponse && <div className="toast-message comparison-result-note" role="status"><Check size={15} /><span>Comparison completed. Best priority: <strong>{comparisonResponse.best_priority_achieved}</strong>. The response is saved for the Algorithm Comparison page.</span></div>}
        <div className="summary-note"><Info size={14} /><span>Only resources marked Available in the live inventory are selectable.</span></div>
      </aside>
    </div>
  </div>
}
