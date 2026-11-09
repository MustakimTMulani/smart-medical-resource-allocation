import { ArrowUpRight, Check, Code2, Database, Layers, Target, Workflow } from 'lucide-react'
import PageSection from '../components/PageSection'

const principles = [
  { icon: Target, title: 'Improve allocation quality', text: 'Compare how different algorithmic strategies prioritize medical resources under a shared budget.' },
  { icon: Layers, title: 'Make trade-offs visible', text: 'Present solution quality, execution time, and memory use in a clear side-by-side view.' },
  { icon: Workflow, title: 'Support learning', text: 'Offer an approachable, interactive demonstration of three core algorithm design paradigms.' },
]
const paradigms = [
  { number: '01', title: 'Divide and Conquer', tag: 'EXHAUSTIVE · OPTIMAL', text: 'Recursively considers both including and excluding each resource. This explores every feasible combination and returns the best priority value, with execution time growing exponentially as the dataset expands.', tone: 'blue' },
  { number: '02', title: 'Greedy', tag: 'HEURISTIC · FAST', text: 'Ranks each resource by priority relative to cost, then selects the best ratios that fit the budget. It is quick and easy to interpret, but a local choice does not guarantee a globally optimal allocation.', tone: 'amber' },
  { number: '03', title: 'Dynamic Programming', tag: 'TABULATION · OPTIMAL', text: 'Builds a table of best achievable priorities for smaller resource sets and budgets. The stored subproblem results support an optimal solution while avoiding repeated work.', tone: 'green' },
]
const stack = [
  { icon: Code2, name: 'React + Vite', detail: 'Interactive frontend' },
  { icon: Layers, name: 'Tailwind CSS', detail: 'Responsive styling' },
  { icon: Workflow, name: 'FastAPI', detail: 'Python API layer' },
  { icon: Database, name: 'SQLite', detail: 'Local data store' },
  { icon: Target, name: 'Chart.js', detail: 'Performance charts' },
]

export default function About() {
  return <div className="page-stack">
    <section className="about-hero"><div className="about-hero-copy"><span className="eyebrow">COLLEGE PROJECT · ALGORITHM ANALYSIS</span><h2>Smarter choices for<br /><em>essential resources.</em></h2><p>Smart Medical Resource Allocation System is an educational project exploring how algorithm design can support more thoughtful healthcare resource planning.</p><div className="about-hero-pills"><span><Check size={14} /> 0/1 Knapsack</span><span><Check size={14} /> 3 paradigms</span><span><Check size={14} /> Healthcare context</span></div></div><div className="about-art" aria-hidden="true"><div className="about-art-orbit orbit-one" /><div className="about-art-orbit orbit-two" /><div className="about-art-core">+</div><span className="orbit-chip chip-a">Care</span><span className="orbit-chip chip-b">Priority</span><span className="orbit-chip chip-c">Budget</span></div></section>
    <div className="about-columns"><PageSection title="Problem statement" description="Why resource allocation matters"><div className="prose-copy"><p>Healthcare facilities work with limited budgets and competing needs. A decision to allocate one resource affects how much remains for others, while each option may contribute a different level of clinical priority.</p><p>This project models those choices as the <strong>0/1 Knapsack Problem</strong>: each resource is either selected once or left out, the total cost must stay within a budget, and the goal is to maximize total priority.</p></div><div className="problem-equation"><span>MAXIMIZE</span><strong>Σ priorityᵢ × selectedᵢ</strong><i>subject to</i><strong>Σ costᵢ × selectedᵢ ≤ budget</strong><small>Each resource is either selected (1) or not selected (0).</small></div></PageSection><PageSection title="Project objectives" description="What this study sets out to explore"><div className="objective-list">{principles.map(({ icon: Icon, title, text }, index) => <div key={title}><span className={`objective-icon objective-${index}`}><Icon size={17} /></span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div></PageSection></div>
    <PageSection title="Algorithm design paradigms" description="Three ways to reason about the same allocation problem"><div className="paradigm-grid">{paradigms.map((item) => <article className="paradigm-card" key={item.number}><div className="paradigm-top"><span>{item.number}</span><span className={`paradigm-tag ${item.tone}`}>{item.tag}</span></div><h3>{item.title}</h3><p>{item.text}</p><div className="paradigm-bottom"><span className={`paradigm-mark ${item.tone}`}><Check size={14} /></span><span>{item.tone === 'amber' ? 'Feasible result, not always optimal' : 'Returns an optimal result'}</span></div></article>)}</div></PageSection>
    <PageSection title="Technology stack" description="Tools used to build this learning experience"><div className="tech-stack-grid">{stack.map(({ icon: Icon, name, detail }) => <div key={name} className="tech-item"><span><Icon size={18} /></span><div><strong>{name}</strong><small>{detail}</small></div><ArrowUpRight size={14} className="tech-arrow" /></div>)}</div></PageSection>
    <div className="about-disclaimer"><span className="about-disclaimer-mark">i</span><p><strong>Educational demonstration</strong><span>Algorithm outputs and performance figures in this interface use mock data. They are intended for academic comparison and are not clinical recommendations.</span></p></div>
  </div>
}
