import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowDownToLine, Clock3, Database, Gauge, Layers3, LoaderCircle, RefreshCw, Target, Zap } from 'lucide-react'
import PageSection from '../components/PageSection'
import { ComparisonChart, QualityChart } from '../components/Charts'
import { fetchBenchmarks } from '../services/api'

const algorithmOrder = ['Divide and Conquer', 'Greedy', 'Dynamic Programming']
const algorithmPresentation = {
  'Divide and Conquer': { tone: 'blue', timeComplexity: 'O(2ⁿ)', spaceComplexity: 'O(n)' },
  Greedy: { tone: 'amber', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)' },
  'Dynamic Programming': { tone: 'green', timeComplexity: 'O(nW)', spaceComplexity: 'O(nW)' },
}
const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 })

function validBenchmarkPayload(payload) {
  if (!payload || typeof payload !== 'object' || typeof payload.memory_measurement !== 'string' || !payload.memory_measurement.trim() || !Array.isArray(payload.results)) return false
  return payload.results.every((row) => {
    if (!row || typeof row.algorithm_name !== 'string' || !algorithmOrder.includes(row.algorithm_name) ||
        !Number.isInteger(row.number_of_items) || row.number_of_items < 1 ||
        !Number.isInteger(row.budget) || row.budget < 0 ||
        !['completed', 'skipped'].includes(row.status)) return false
    if (row.status === 'skipped') return row.average_execution_time_seconds === null && row.average_peak_memory_bytes === null && row.total_cost === null && row.total_priority === null && row.is_optimal === null && typeof row.status_detail === 'string'
    return typeof row.average_execution_time_seconds === 'number' && Number.isFinite(row.average_execution_time_seconds) && row.average_execution_time_seconds >= 0 &&
      typeof row.average_peak_memory_bytes === 'number' && Number.isFinite(row.average_peak_memory_bytes) && row.average_peak_memory_bytes >= 0 &&
      Number.isInteger(row.total_cost) && row.total_cost >= 0 && row.total_cost <= row.budget &&
      typeof row.total_priority === 'number' && Number.isFinite(row.total_priority) && row.total_priority >= 0 &&
      typeof row.is_optimal === 'boolean' && row.status_detail === null
  })
}

function hasCompleteAlgorithmSets(rows) {
  const grouped = new Map()
  for (const row of rows) {
    const names = grouped.get(row.number_of_items) ?? new Set()
    if (names.has(row.algorithm_name)) return false
    names.add(row.algorithm_name)
    grouped.set(row.number_of_items, names)
  }
  return [...grouped.values()].every((names) => names.size === algorithmOrder.length && algorithmOrder.every((name) => names.has(name)))
}

function formatMilliseconds(seconds) {
  return seconds === null || seconds === undefined ? '—' : `${numberFormat.format(seconds * 1000)} ms`
}

function formatMemory(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  return bytes < 1024 ? `${numberFormat.format(bytes)} B` : `${numberFormat.format(bytes / 1024)} KB`
}

function benchmarkStatus(row) {
  return row.status === 'skipped'
    ? `Skipped${row.status_detail ? ` · ${row.status_detail}` : ''}`
    : 'Completed'
}

function LoadingState() {
  return <div className="performance-state" role="status"><LoaderCircle size={21} className="api-spin" /><strong>Loading saved benchmark results…</strong><span>Reading the existing CSV file from the backend.</span></div>
}

function ErrorState({ message, onRetry }) {
  return <div className="performance-state performance-state-error" role="alert"><AlertCircle size={22} /><strong>Benchmark results could not be loaded</strong><span>{message}</span><button type="button" className="button-outline" onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>
}

function EmptyState() {
  return <div className="performance-state" role="status"><Database size={22} /><strong>No benchmark results are available</strong><span>Generate the CSV with the existing backend benchmark command, then reload this page.</span></div>
}

function ComplexitySection() {
  return <>
    <PageSection title="Theoretical time complexity" description="Based on the current Python implementations">
      <div className="complexity-grid">{algorithmOrder.map((name) => <article className={`complexity-card ${algorithmPresentation[name].tone}`} key={name}><strong>{name}</strong><code>{algorithmPresentation[name].timeComplexity}</code><span>{name === 'Divide and Conquer' ? 'Exhaustive recursive include/exclude search.' : name === 'Greedy' ? 'Ratio calculation and sorting, followed by a linear selection pass.' : 'Fills every cell in an (n + 1) × (W + 1) table.'}</span></article>)}</div>
    </PageSection>
    <PageSection title="Theoretical space complexity" description="Auxiliary storage used by each implementation">
      <div className="complexity-grid">{algorithmOrder.map((name) => <article className={`complexity-card ${algorithmPresentation[name].tone}`} key={name}><strong>{name}</strong><code>{algorithmPresentation[name].spaceComplexity}</code><span>{name === 'Divide and Conquer' ? 'Recursive call stack depth grows with the item count.' : name === 'Greedy' ? 'Stores indexed and sorted resource references.' : 'Stores the full dynamic programming table.'}</span></article>)}</div>
      <p className="complexity-note"><strong>Notation:</strong> n is the number of resources. W is the integer budget, so Dynamic Programming time and table space depend on the numeric budget value.</p>
    </PageSection>
  </>
}

export default function Performance() {
  const [benchmarks, setBenchmarks] = useState([])
  const [memoryMeasurement, setMemoryMeasurement] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestedSize, setRequestedSize] = useState('')

  const loadBenchmarks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchBenchmarks()
      if (!validBenchmarkPayload(payload) || !hasCompleteAlgorithmSets(payload.results)) throw new Error('The backend returned an incomplete or invalid benchmark response.')
      setBenchmarks(payload.results)
      setMemoryMeasurement(payload.memory_measurement)
    } catch (loadError) {
      setError(loadError.message || 'Could not load benchmark results.')
      setBenchmarks([])
      setMemoryMeasurement('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBenchmarks()
  }, [loadBenchmarks])

  const sizes = useMemo(() => [...new Set(benchmarks.map((row) => row.number_of_items))].sort((a, b) => a - b), [benchmarks])
  const selectedSize = sizes.includes(Number(requestedSize)) ? Number(requestedSize) : sizes.at(-1)
  const sizeRows = benchmarks.filter((row) => row.number_of_items === selectedSize)
  const completedAtSize = sizeRows.filter((row) => row.status === 'completed')
  const fastest = completedAtSize.reduce((best, row) => !best || row.average_execution_time_seconds < best.average_execution_time_seconds ? row : best, null)
  const bestPriority = completedAtSize.reduce((best, row) => !best || row.total_priority > best.total_priority ? row : best, null)
  const optimalCount = completedAtSize.filter((row) => row.is_optimal).length

  const timeDatasets = algorithmOrder.map((name) => ({
    label: name,
    data: sizes.map((size) => {
      const row = benchmarks.find((item) => item.number_of_items === size && item.algorithm_name === name)
      return row?.status === 'completed' ? row.average_execution_time_seconds * 1000 : null
    }),
  }))
  const memoryDatasets = algorithmOrder.map((name) => ({
    label: name,
    data: sizes.map((size) => {
      const row = benchmarks.find((item) => item.number_of_items === size && item.algorithm_name === name)
      return row?.status === 'completed' ? row.average_peak_memory_bytes / 1024 : null
    }),
  }))
  const qualityDatasets = algorithmOrder.map((name) => ({
    label: name,
    data: sizes.map((size) => {
      const rows = benchmarks.filter((item) => item.number_of_items === size && item.status === 'completed')
      const best = Math.max(0, ...rows.map((row) => row.total_priority))
      const row = rows.find((item) => item.algorithm_name === name)
      return !row ? null : best > 0 ? row.total_priority / best * 100 : 100
    }),
  }))
  const orderedRows = [...benchmarks].sort((a, b) => a.number_of_items - b.number_of_items || algorithmOrder.indexOf(a.algorithm_name) - algorithmOrder.indexOf(b.algorithm_name))

  return <div className="page-stack">
    <div className="performance-banner"><div className="performance-banner-icon"><Gauge size={21} /></div><div><span className="eyebrow">SAVED BENCHMARK DATA</span><strong>Performance analysis</strong><span>Experimental measurements read from the existing backend CSV.</span></div>{!loading && !error && sizes.length > 0 && <label className="dataset-select"><span>FOCUS DATASET</span><select aria-label="Select dataset size" value={selectedSize ?? ''} onChange={(event) => setRequestedSize(event.target.value)}>{sizes.map((value) => <option key={value} value={value}>{value} items</option>)}</select></label>}<button type="button" className="icon-button benchmark-refresh" aria-label="Reload benchmark results" onClick={loadBenchmarks} disabled={loading}><RefreshCw size={15} /></button></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={loadBenchmarks} /> : benchmarks.length === 0 ? <EmptyState /> : <>
      <div className="stats-grid performance-stats"><article className="stat-card"><div className="stat-card-head"><span>Fastest at {selectedSize} items</span><span className="stat-icon stat-green"><Zap size={18} /></span></div><div className="stat-value performance-stat-text">{fastest?.algorithm_name ?? '—'}</div><div className="stat-foot"><strong className="simple-foot">Average measured time</strong><span>{fastest ? formatMilliseconds(fastest.average_execution_time_seconds) : 'No completed runs'}</span></div></article><article className="stat-card"><div className="stat-card-head"><span>Highest priority at {selectedSize}</span><span className="stat-icon stat-blue"><Target size={18} /></span></div><div className="stat-value">{bestPriority ? numberFormat.format(bestPriority.total_priority) : '—'}</div><div className="stat-foot"><strong className="simple-foot">{bestPriority?.algorithm_name ?? 'No completed runs'}</strong><span>Priority achieved</span></div></article><article className="stat-card"><div className="stat-card-head"><span>Largest dataset</span><span className="stat-icon stat-amber"><ArrowDownToLine size={18} /></span></div><div className="stat-value">{sizes.at(-1)}<small> items</small></div><div className="stat-foot"><strong className="simple-foot">{sizes.length} dataset sizes</strong><span>Read from benchmark CSV</span></div></article><article className="stat-card"><div className="stat-card-head"><span>Optimal matching results</span><span className="stat-icon stat-purple"><Layers3 size={18} /></span></div><div className="stat-value">{optimalCount}<small> of {completedAtSize.length}</small></div><div className="stat-foot"><strong className="simple-foot">At {selectedSize} items</strong><span>Based on stored is_optimal values</span></div></article></div>
      <div className="performance-chart-grid">
        <PageSection title="Execution-time comparison" description="Average measured runtime by dataset size · milliseconds" action={<span className="chart-unit">LOWER IS FASTER</span>}><div className="performance-chart"><ComparisonChart labels={sizes.map((value) => `${value} items`)} datasets={timeDatasets} unit="ms" /></div></PageSection>
        <PageSection title="Memory consumption" description="Average Python-tracked peak by dataset size · KB" action={<span className="chart-unit">LOWER IS LIGHTER</span>}><div className="performance-chart"><ComparisonChart labels={sizes.map((value) => `${value} items`)} datasets={memoryDatasets} unit="KB" /></div></PageSection>
      </div>
      <PageSection title="Solution quality by input size" description="Priority achieved as a percentage of the best completed result at each size" action={<span className="chart-unit">HIGHER IS BETTER</span>}><div className="quality-chart"><QualityChart labels={sizes.map((value) => `${value} items`)} datasets={qualityDatasets} min={0} max={100} /></div></PageSection>
      <PageSection title="Benchmark results" description="Average timing and memory values are recorded across repeated runs; blank skipped values stay unavailable."><div className="table-wrap benchmark-table-wrap"><table className="data-table benchmark-table"><thead><tr><th>ALGORITHM</th><th>INPUT SIZE</th><th>BUDGET</th><th>AVG TIME</th><th>AVG PEAK MEMORY</th><th>PRIORITY</th><th>OPTIMAL MATCH</th><th>STATUS</th></tr></thead><tbody>{orderedRows.map((row, index) => <tr key={`${row.algorithm_name}-${row.number_of_items}-${index}`} className={row.status === 'skipped' ? 'benchmark-skipped-row' : ''}><td><strong>{row.algorithm_name}</strong></td><td>{row.number_of_items}</td><td>{row.budget}</td><td>{formatMilliseconds(row.average_execution_time_seconds)}</td><td>{formatMemory(row.average_peak_memory_bytes)}</td><td>{row.total_priority === null ? '—' : numberFormat.format(row.total_priority)}</td><td>{row.is_optimal === null ? '—' : row.is_optimal ? 'Yes' : 'No'}</td><td><span className={`benchmark-status ${row.status}`}>{benchmarkStatus(row)}</span></td></tr>)}</tbody></table></div></PageSection>
      <ComplexitySection />
      <div className="performance-footnote"><span className="footnote-icon">i</span><p><strong>Experimental measurement notes</strong> Timings are averages from the saved benchmark runs. {memoryMeasurement} Skipped Divide and Conquer measurements are left blank because of the benchmark safety cap. Complexity is theoretical: W denotes the integer budget.</p></div>
    </>}
  </div>
}
