import { useMemo, useState } from 'react'
import { ArrowDownToLine, Gauge, Layers3, Timer, Zap } from 'lucide-react'
import PageSection from '../components/PageSection'
import { ComparisonChart, QualityChart } from '../components/Charts'
import { performanceBySize } from '../data/mockData'

const names = ['Divide and Conquer', 'Greedy', 'Dynamic Programming']

export default function Performance() {
  const [size, setSize] = useState('30')
  const series = useMemo(() => Object.entries(performanceBySize), [])
  const current = performanceBySize[size]
  const timeData = names.map((label, index) => ({ label, data: series.map(([, row]) => row.time[index]) }))
  const memoryData = names.map((label, index) => ({ label, data: series.map(([, row]) => row.memory[index]) }))
  const qualityData = names.map((label, index) => ({ label, data: series.map(([, row]) => row.quality[index]) }))
  return <div className="page-stack">
    <div className="performance-banner"><div className="performance-banner-icon"><Gauge size={21} /></div><div><span className="eyebrow">BENCHMARK OVERVIEW</span><strong>Performance at a glance</strong><span>Illustrative benchmark data across increasing synthetic dataset sizes.</span></div><label className="dataset-select"><span>FOCUS DATASET</span><select aria-label="Select dataset size" value={size} onChange={(event) => setSize(event.target.value)}>{Object.keys(performanceBySize).map((value) => <option key={value} value={value}>{value} items</option>)}</select></label></div>
    <div className="stats-grid performance-stats"><article className="stat-card"><div className="stat-card-head"><span>Fastest at {size} items</span><span className="stat-icon stat-green"><Zap size={18} /></span></div><div className="stat-value">{current.time[1].toFixed(1)}<small> ms</small></div><div className="stat-foot"><strong className="simple-foot">Greedy heuristic</strong><span>Lowest execution time</span></div></article><article className="stat-card"><div className="stat-card-head"><span>Best solution quality</span><span className="stat-icon stat-blue"><Layers3 size={18} /></span></div><div className="stat-value">{current.quality[2]}<small>%</small></div><div className="stat-foot"><strong className="simple-foot">Dynamic Programming</strong><span>Optimal priority score</span></div></article><article className="stat-card"><div className="stat-card-head"><span>Largest dataset</span><span className="stat-icon stat-amber"><ArrowDownToLine size={18} /></span></div><div className="stat-value">30<small> items</small></div><div className="stat-foot"><strong className="simple-foot">5 dataset sizes</strong><span>10 to 30 resources</span></div></article><article className="stat-card"><div className="stat-card-head"><span>Optimal approaches</span><span className="stat-icon stat-purple"><Timer size={18} /></span></div><div className="stat-value">2<small> of 3</small></div><div className="stat-foot"><strong className="simple-foot">Exact methods</strong><span>Divide & conquer + DP</span></div></article></div>
    <div className="performance-chart-grid">
      <PageSection title="Execution time comparison" description="Average runtime by dataset size · milliseconds" action={<span className="chart-unit">LOWER IS FASTER</span>}><div className="performance-chart"><ComparisonChart labels={series.map(([label]) => `${label} items`)} datasets={timeData} unit="ms" /></div></PageSection>
      <PageSection title="Memory consumption" description="Average peak memory by dataset size · MB" action={<span className="chart-unit">LOWER IS LIGHTER</span>}><div className="performance-chart"><ComparisonChart labels={series.map(([label]) => `${label} items`)} datasets={memoryData} unit="MB" /></div></PageSection>
    </div>
    <PageSection title="Solution quality" description="Priority achieved as a percentage of the best known result" action={<span className="chart-unit">HIGHER IS BETTER</span>}><div className="quality-chart"><QualityChart labels={series.map(([label]) => `${label} items`)} datasets={qualityData} /></div></PageSection>
    <div className="performance-footnote"><span className="footnote-icon">i</span><p><strong>About these measurements</strong> These charts use illustrative mock data for interface demonstration, not measured performance. Actual results will be populated from benchmark CSV outputs when connected.</p></div>
  </div>
}
