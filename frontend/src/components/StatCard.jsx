import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export default function StatCard({ label, value, note, change, icon: Icon, tone = 'green', prefix, suffix }) {
  const down = change?.startsWith('-')
  return <article className="stat-card">
    <div className="stat-card-head"><span>{label}</span><span className={`stat-icon stat-${tone}`}><Icon size={18} strokeWidth={1.9} /></span></div>
    <div className="stat-value">{prefix}{value}{suffix}</div>
    <div className="stat-foot"><span className={`stat-change ${down ? 'negative' : ''}`}>{down ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{change}</span><span>{note}</span></div>
  </article>
}
