import { Activity, ArrowRight, ArrowUpRight, Boxes, CircleDollarSign, Clock3, Target, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageSection from '../components/PageSection'
import StatCard from '../components/StatCard'
import AlgorithmCard from '../components/AlgorithmCard'
import { AlgorithmMixChart, BudgetTrendChart } from '../components/Charts'
import { activities, algorithmSummaries, formatCurrency } from '../data/mockData'

const recentActivities = activities.slice(0, 4)

export default function Dashboard() {
  return <div className="page-stack">
    <div className="welcome-strip"><div className="welcome-copy"><span className="welcome-kicker"><span className="welcome-star">✦</span> {new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase()}</span><h2>Thoughtful allocation starts with <em>better insight.</em></h2><p>Review your inventory, prioritize critical needs, and make every budget decision count.</p><div className="welcome-actions"><Link className="button-primary" to="/allocation">Plan an allocation <ArrowRight size={16} /></Link><Link className="button-quiet" to="/algorithms">Compare algorithms <ArrowUpRight size={15} /></Link></div></div><div className="welcome-illustration" aria-hidden="true"><div className="illustration-halo" /><div className="ill-card ill-card-one"><span className="ill-pulse">↗</span><div className="ill-lines"><i /><i /><i /></div></div><div className="ill-card ill-card-two"><div className="ill-cross">+</div><div><strong>Care, allocated</strong><small>With clarity and confidence</small></div></div><div className="ill-dot ill-dot-one" /><div className="ill-dot ill-dot-two" /></div></div>
    <div className="stats-grid">
      <StatCard label="Medical resources" value="8" note="Across 6 categories" change="8.2%" icon={Boxes} tone="green" />
      <StatCard label="Available budget" value="12.5L" prefix="₹" note="Of ₹20L total budget" change="4.6%" icon={Wallet} tone="blue" />
      <StatCard label="Allocated budget" value="7.5L" prefix="₹" note="37.5% of total budget" change="2.1%" icon={CircleDollarSign} tone="amber" />
      <StatCard label="Priority score" value="92.4" suffix="/100" note="Across current allocations" change="6.4%" icon={Target} tone="purple" />
    </div>
    <div className="dashboard-main-grid">
      <PageSection title="Budget allocation" description="Your budget distribution over the past 7 weeks" action={<button className="select-quiet">Last 7 weeks <span>⌄</span></button>} className="trend-panel">
        <div className="chart-legend-note"><span><i className="legend-dot green-dot" />Allocated</span><span><i className="legend-dot blue-dot" />Available</span><strong>₹20,00,000 <small>total budget</small></strong></div>
        <div className="trend-chart"><BudgetTrendChart /></div>
      </PageSection>
      <PageSection title="Allocation mix" description="Decisions by approach this month" className="mix-panel">
        <div className="mix-chart-wrap"><AlgorithmMixChart /><div className="mix-center"><strong>48</strong><span>plans</span></div></div>
        <div className="mix-legend"><div><span><i className="legend-dot green-dot" />Dynamic programming</span><b>54%</b></div><div><span><i className="legend-dot amber-dot" />Greedy heuristic</span><b>31%</b></div><div><span><i className="legend-dot blue-dot" />Divide & conquer</span><b>15%</b></div></div>
      </PageSection>
    </div>
    <div className="dashboard-secondary-grid">
      <PageSection title="Recent activity" description="The latest changes across your workspace" action={<Link className="section-link" to="/inventory">View inventory <ArrowRight size={14} /></Link>}>
        <div className="activity-list">{recentActivities.map((item) => <div className="activity-row" key={item.id}><span className={`activity-symbol ${item.tone}`}><Activity size={16} /></span><div className="activity-main"><strong>{item.action}</strong><span>{item.resource} <i>·</i> {item.detail}</span></div><time>{item.time}</time></div>)}</div>
      </PageSection>
      <PageSection title="System snapshot" description="A quick view of current readiness" action={<span className="status-tag status-ready"><i />Operational</span>}>
        <div className="snapshot-list"><div><span className="snapshot-icon"><Boxes size={16} /></span><span>Available resources</span><strong>5 <small>/ 8</small></strong></div><div><span className="snapshot-icon"><Clock3 size={16} /></span><span>Last comparison run</span><strong>2h ago</strong></div><div><span className="snapshot-icon"><Target size={16} /></span><span>Priority coverage</span><strong>92.4%</strong></div></div>
        <div className="snapshot-progress"><div><span>Budget utilization</span><b>37.5%</b></div><div className="progress-track"><i style={{ width: '37.5%' }} /></div><small>{formatCurrency(750000)} of {formatCurrency(2000000)} allocated</small></div>
      </PageSection>
    </div>
    <PageSection title="Algorithm overview" description="Three approaches, one clearer view of your choices" action={<Link className="section-link" to="/algorithms">Explore comparison <ArrowRight size={14} /></Link>}>
      <div className="algorithm-grid">{algorithmSummaries.map((algorithm) => <AlgorithmCard key={algorithm.name} algorithm={algorithm} result={{ priority: algorithm.name === 'Greedy' ? '88.6' : '92.4' }} />)}</div>
    </PageSection>
  </div>
}


