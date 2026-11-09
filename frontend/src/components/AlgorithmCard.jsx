import { ArrowUpRight, Check, Clock3, Cpu } from 'lucide-react'

export default function AlgorithmCard({ algorithm, result, recommended = false, onClick }) {
  const Icon = algorithm.icon
  return <article className={`algorithm-card ${recommended ? 'recommended' : ''}`}>
    {recommended && <div className="recommended-ribbon"><Check size={13} /> OPTIMAL RESULT</div>}
    <div className="algorithm-card-head"><span className={`algorithm-icon ${algorithm.color}`}><Icon size={19} /></span><span className={`algorithm-tag ${algorithm.color}`}>{algorithm.short}</span></div>
    <h3>{algorithm.name}</h3><p>{algorithm.description}</p>
    <div className="algorithm-metrics"><div><Clock3 size={14} /><span>{result?.time || algorithm.time}</span></div><div><Cpu size={14} /><span>{result?.memory || algorithm.memory}</span></div></div>
    <div className="algorithm-card-foot"><span>Priority score <strong>{result?.priority ?? algorithm.priority ?? '—'}</strong></span><button className="text-action" onClick={onClick}>View details <ArrowUpRight size={14} /></button></div>
  </article>
}
