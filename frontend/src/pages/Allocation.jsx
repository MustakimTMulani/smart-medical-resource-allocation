import { useMemo, useState } from 'react'
import { ArrowRight, Check, CircleDollarSign, Info, PackageCheck, RotateCcw, ShieldCheck, Wallet } from 'lucide-react'
import PageSection from '../components/PageSection'
import { formatCurrency, resources } from '../data/mockData'

export default function Allocation() {
  const [budget, setBudget] = useState(500000)
  const [selected, setSelected] = useState(['MED-001', 'MED-002', 'MED-007'])
  const [planned, setPlanned] = useState(false)
  const chosen = useMemo(() => resources.filter((item) => selected.includes(item.id)), [selected])
  const totalCost = chosen.reduce((sum, item) => sum + item.cost, 0)
  const totalPriority = chosen.reduce((sum, item) => sum + item.priority, 0)
  const remaining = budget - totalCost
  const toggle = (id) => { setPlanned(false); setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]) }
  return <div className="page-stack">
    <div className="allocation-banner"><span className="banner-icon"><ShieldCheck size={20} /></span><div><strong>Build a plan that fits your care priorities.</strong><span>Select the resources you need. Totals update instantly using the sample inventory.</span></div><span className="mock-data-pill"><i /> Mock data</span></div>
    <div className="allocation-layout">
      <div className="allocation-main"><PageSection title="Set your available budget" description="Define the maximum spend for this allocation plan"><label className="budget-input-wrap"><span className="currency-prefix">₹</span><input aria-label="Available budget in rupees" type="number" min="0" step="10000" value={budget} onChange={(event) => { setBudget(Number(event.target.value)); setPlanned(false) }} /><span className="budget-currency">INR</span></label><div className="budget-quick-picks"><span>Quick set</span>{[250000, 500000, 1000000].map((value) => <button key={value} className={budget === value ? 'active' : ''} onClick={() => { setBudget(value); setPlanned(false) }}>{formatCurrency(value)}</button>)}</div></PageSection>
        <PageSection title="Choose medical resources" description={`${resources.length} items in the sample inventory`} action={<button className="text-action" onClick={() => { setSelected([]); setPlanned(false) }}><RotateCcw size={14} /> Clear selection</button>}>
          <div className="allocation-resource-list">{resources.map((item) => { const checked = selected.includes(item.id); const fits = checked || totalCost + item.cost <= budget; return <label key={item.id} className={`allocation-resource ${checked ? 'selected' : ''} ${!fits ? 'over-budget' : ''}`}><input type="checkbox" checked={checked} disabled={!fits} onChange={() => toggle(item.id)} /><span className="allocation-checkbox"><Check size={13} /></span><span className="allocation-resource-copy"><strong>{item.name}</strong><small>{item.category} <i>·</i> Priority {item.priority}</small></span><span className="resource-inline-priority"><i style={{ width: `${item.priority}%` }} /></span><strong className="allocation-cost">{formatCurrency(item.cost)}</strong></label> })}</div>
        </PageSection></div>
      <aside className="allocation-summary"><div className="summary-top"><span className="summary-icon"><PackageCheck size={20} /></span><div><span className="eyebrow">ALLOCATION SUMMARY</span><h2>Your plan</h2></div><span className="summary-draft">DRAFT</span></div><div className="summary-budget"><span>Available budget</span><strong>{formatCurrency(budget)}</strong><div className="summary-progress"><i style={{ width: `${Math.min(budget ? totalCost / budget * 100 : 0, 100)}%` }} /></div><small>{budget ? Math.min((totalCost / budget * 100), 100).toFixed(1) : '0.0'}% budget used</small></div><div className="summary-metrics"><div><span><CircleDollarSign size={15} /> Total cost</span><strong>{formatCurrency(totalCost)}</strong></div><div><span><Wallet size={15} /> Remaining</span><strong className={remaining < 0 ? 'text-danger' : ''}>{formatCurrency(remaining)}</strong></div><div><span><ShieldCheck size={15} /> Priority score</span><strong>{totalPriority}</strong></div></div><div className="summary-selected"><span>Selected resources <b>{chosen.length}</b></span>{chosen.length ? chosen.map((item) => <div key={item.id}><span>{item.name}</span><strong>{formatCurrency(item.cost)}</strong></div>) : <p>No resources selected yet.</p>}</div><button className="button-primary full-width" disabled={!chosen.length || remaining < 0} onClick={() => setPlanned(true)}>{planned ? <><Check size={16} /> Plan saved</> : <>Create allocation plan <ArrowRight size={16} /></>}</button>{planned && <div className="plan-success" role="status"><Check size={15} /> Your sample allocation plan is ready.</div>}<div className="summary-note"><Info size={14} /><span>This is a mock planning view. It does not persist or submit allocations.</span></div></aside>
    </div>
  </div>
}
