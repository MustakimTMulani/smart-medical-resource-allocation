import { AlertCircle, Check, Clock3, Cpu, Database, FlaskConical, Layers3, Microscope, Sparkles, Target } from 'lucide-react'
import PageSection from '../components/PageSection'

const algorithmDetails = {
  divide_and_conquer: {
    title: 'Divide and Conquer',
    tone: 'blue',
    icon: Microscope,
    description: 'Recursively evaluates include and exclude choices for each resource.',
  },
  greedy_heuristic: {
    title: 'Greedy',
    tone: 'amber',
    icon: Sparkles,
    description: 'Uses priority-to-cost ordering as a fast heuristic; optimality is not guaranteed.',
  },
  dynamic_programming: {
    title: 'Dynamic Programming',
    tone: 'green',
    icon: Layers3,
    description: 'Uses a dynamic programming table to find an optimal selection.',
  },
}

const expectedAlgorithmKeys = Object.keys(algorithmDetails)
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 })

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isValidResult(result) {
  return result &&
    typeof result.algorithm_name === 'string' && expectedAlgorithmKeys.includes(result.algorithm_name) &&
    Array.isArray(result.selected_resources) && result.selected_resources.every((resource) =>
      resource && (typeof resource.id === 'string' || Number.isInteger(resource.id)) &&
      typeof resource.name === 'string' && isNonNegativeNumber(resource.cost) &&
      isNonNegativeNumber(resource.priority)) &&
    Number.isInteger(result.total_cost) && result.total_cost >= 0 &&
    isNonNegativeNumber(result.total_priority) &&
    Number.isInteger(result.remaining_budget) && result.remaining_budget >= 0 &&
    typeof result.guaranteed_optimal === 'boolean' &&
    isNonNegativeNumber(result.execution_time_ms) &&
    (result.peak_python_memory_bytes === null ||
      Number.isSafeInteger(result.peak_python_memory_bytes) && result.peak_python_memory_bytes >= 0)
}

function getResponseError(response) {
  if (response == null) return ''
  if (!response || typeof response !== 'object') return 'The saved comparison response has an invalid format. Run a new comparison from Resource Allocation.'
  if (!Number.isInteger(response.input_resource_count) || response.input_resource_count < 0 ||
      !Number.isInteger(response.available_budget) || response.available_budget < 0 ||
      !isNonNegativeNumber(response.best_priority_achieved) ||
      typeof response.memory_measurement !== 'string' || !response.memory_measurement ||
      !Array.isArray(response.results) || response.results.length !== expectedAlgorithmKeys.length ||
      !response.results.every(isValidResult)) {
    return 'The saved comparison response is incomplete or invalid. Return to Resource Allocation and run the comparison again.'
  }

  const resultKeys = response.results.map((result) => result.algorithm_name)
  if (new Set(resultKeys).size !== expectedAlgorithmKeys.length ||
      !expectedAlgorithmKeys.every((key) => resultKeys.includes(key))) {
    return 'The saved response does not contain one result for each algorithm. Run a new comparison from Resource Allocation.'
  }

  const highestResultPriority = Math.max(...response.results.map((result) => result.total_priority))
  const expectedBestAlgorithms = response.results
    .filter((result) => result.total_priority === highestResultPriority)
    .map((result) => result.algorithm_name)
  if (response.best_priority_achieved !== highestResultPriority || response.results.some((result) =>
    result.total_cost > response.available_budget ||
    result.remaining_budget !== response.available_budget - result.total_cost ||
    result.total_cost !== result.selected_resources.reduce((sum, resource) => sum + resource.cost, 0) ||
    result.total_priority !== result.selected_resources.reduce((sum, resource) => sum + resource.priority, 0))) {
    return 'The saved results contain inconsistent totals. Return to Resource Allocation and run the comparison again.'
  }

  const summary = response.comparison_summary
  const validSummaryKey = (key) => expectedAlgorithmKeys.includes(key)
  if (!summary || !validSummaryKey(summary.fastest_algorithm) ||
      !(summary.lowest_python_memory_algorithm === null || validSummaryKey(summary.lowest_python_memory_algorithm)) ||
      !Array.isArray(summary.algorithms_matching_best_priority) ||
      !summary.algorithms_matching_best_priority.every((key) => expectedAlgorithmKeys.includes(key)) ||
      typeof summary.greedy_matches_best_priority !== 'boolean' ||
      summary.greedy_matches_best_priority !== (response.results.find((result) => result.algorithm_name === 'greedy_heuristic').total_priority === highestResultPriority) ||
      expectedBestAlgorithms.length !== summary.algorithms_matching_best_priority.length ||
      !expectedBestAlgorithms.every((key) => summary.algorithms_matching_best_priority.includes(key))) {
    return 'The saved comparison summary is invalid. Return to Resource Allocation and run the comparison again.'
  }
  return ''
}

function formatMemory(bytes) {
  if (bytes === null || bytes === undefined) return 'Unavailable'
  if (bytes < 1024) return `${number.format(bytes)} bytes`
  return `${number.format(bytes / 1024)} KB (${number.format(bytes)} bytes)`
}

function EmptyState({ invalid = false, message = '' }) {
  const Icon = invalid ? AlertCircle : FlaskConical
  return <div className={`comparison-empty-state ${invalid ? 'invalid' : ''}`} role={invalid ? 'alert' : 'status'}>
    <span><Icon size={21} /></span>
    <strong>{invalid ? 'Comparison data unavailable' : 'No comparison has been run yet'}</strong>
    <p>{invalid ? message : 'Visit Resource Allocation, select available medical resources, set a budget, and run Compare Algorithms. The live results will appear here.'}</p>
  </div>
}

function AlgorithmResultCard({ result, bestPriority }) {
  const detail = algorithmDetails[result.algorithm_name]
  const Icon = detail.icon
  const achievedBest = result.total_priority === bestPriority
  const recommended = result.guaranteed_optimal && achievedBest

  return <article className={`algorithm-card comparison-result-card ${recommended ? 'recommended' : ''}`}>
    {recommended && <div className="recommended-ribbon"><Check size={13} /> OPTIMAL · BEST PRIORITY</div>}
    <div className="algorithm-card-head">
      <span className={`algorithm-icon ${detail.tone}`}><Icon size={18} /></span>
      <span className={`algorithm-tag ${detail.tone}`}>{result.guaranteed_optimal ? 'OPTIMALITY GUARANTEED' : 'HEURISTIC'}</span>
    </div>
    <h3>{detail.title}</h3>
    <p className="comparison-algorithm-description">{detail.description}</p>
    <div className={`comparison-guarantee ${result.guaranteed_optimal ? 'guaranteed' : 'heuristic'}`}>
      {result.guaranteed_optimal ? <Check size={14} /> : <AlertCircle size={14} />}
      <span>{result.guaranteed_optimal ? 'Guaranteed to be optimal' : 'Feasible solution; not guaranteed optimal'}</span>
    </div>
    <div className="comparison-resource-selection">
      <div className="comparison-selection-heading"><strong>Selected medical resources</strong><span>{result.selected_resources.length}</span></div>
      {result.selected_resources.length ? <ul>{result.selected_resources.map((resource) => <li key={`${typeof resource.id}-${resource.id}`}><span><strong>{resource.name}</strong><small>ID {resource.id} · Priority {number.format(resource.priority)}</small></span><b>{currency.format(resource.cost)}</b></li>)}</ul>
        : <p className="comparison-no-selection">No resources selected.</p>}
    </div>
    <div className="comparison-result-metrics">
      <div><span>Total cost</span><strong>{currency.format(result.total_cost)}</strong></div>
      <div><span>Total priority</span><strong className={achievedBest ? 'priority-score-result' : ''}>{number.format(result.total_priority)}</strong></div>
      <div><span>Remaining budget</span><strong>{currency.format(result.remaining_budget)}</strong></div>
      <div><span><Clock3 size={13} /> Execution time</span><strong>{number.format(result.execution_time_ms)} ms</strong></div>
      <div><span><Cpu size={13} /> Python-tracked peak</span><strong>{formatMemory(result.peak_python_memory_bytes)}</strong></div>
    </div>
  </article>
}

function ComparisonSummary({ response }) {
  const summary = response.comparison_summary
  const names = (keys) => keys.map((key) => algorithmDetails[key].title).join(', ') || 'None'
  const fastest = summary.fastest_algorithm ? algorithmDetails[summary.fastest_algorithm].title : 'Unavailable'
  const lowestMemory = summary.lowest_python_memory_algorithm
    ? algorithmDetails[summary.lowest_python_memory_algorithm].title
    : 'Unavailable'
  const lowestMemoryResult = response.results.find((result) => result.algorithm_name === summary.lowest_python_memory_algorithm)

  return <>
    <div className="stats-grid comparison-summary-stats">
      <article className="stat-card"><div className="stat-card-head"><span>Highest priority achieved</span><span className="stat-icon stat-green"><Target size={17} /></span></div><div className="stat-value">{number.format(response.best_priority_achieved)}</div><div className="stat-foot"><strong className="simple-foot">Best result</strong><span>{names(summary.algorithms_matching_best_priority)}</span></div></article>
      <article className="stat-card"><div className="stat-card-head"><span>Fastest algorithm</span><span className="stat-icon stat-blue"><Clock3 size={17} /></span></div><div className="stat-value summary-text-value">{fastest}</div><div className="stat-foot"><strong className="simple-foot">Measured runtime</strong><span>{number.format(response.results.find((result) => result.algorithm_name === summary.fastest_algorithm)?.execution_time_ms ?? 0)} ms</span></div></article>
      <article className="stat-card"><div className="stat-card-head"><span>Lowest measured memory</span><span className="stat-icon stat-purple"><Database size={17} /></span></div><div className="stat-value summary-text-value">{lowestMemory}</div><div className="stat-foot"><strong className="simple-foot">Python-tracked peak</strong><span>{formatMemory(lowestMemoryResult?.peak_python_memory_bytes)}</span></div></article>
      <article className="stat-card"><div className="stat-card-head"><span>Algorithms at best priority</span><span className="stat-icon stat-amber"><Layers3 size={17} /></span></div><div className="stat-value summary-text-value">{summary.algorithms_matching_best_priority.length} of 3</div><div className="stat-foot"><strong className="simple-foot">Matching result</strong><span>{names(summary.algorithms_matching_best_priority)}</span></div></article>
    </div>
  </>
}

export default function Algorithms({ comparisonResponse }) {
  const responseError = getResponseError(comparisonResponse)

  return <div className="page-stack">
    <div className="comparison-banner"><span className="comparison-banner-icon"><Microscope size={18} /></span><div><strong>Algorithm comparison</strong><span>Actual results from the last successful backend comparison.</span></div><span className="comparison-live-label">LIVE API RESULTS</span></div>
    {responseError ? <EmptyState invalid message={responseError} />
      : !comparisonResponse ? <EmptyState />
        : <>
          <div className="comparison-intro"><div><span className="eyebrow">COMPARISON RESULTS</span><h2>Three approaches, one shared allocation</h2><p>{comparisonResponse.input_resource_count} resources · {currency.format(comparisonResponse.available_budget)} budget</p></div><div className="benchmark-context"><span>MEMORY MEASUREMENT</span><strong>Python-tracked allocations</strong><small>Not total process memory</small></div></div>
          <ComparisonSummary response={comparisonResponse} />
          <PageSection title="Results by algorithm" description="Every algorithm received the same selected resources and budget" className="comparison-results-section">
            <div className="algorithm-grid comparison-cards">{comparisonResponse.results.map((result) => <AlgorithmResultCard key={result.algorithm_name} result={result} bestPriority={comparisonResponse.best_priority_achieved} />)}</div>
          </PageSection>
          <div className="comparison-measurement-note"><InfoIcon /><span>{comparisonResponse.memory_measurement} Execution time and memory usage are measured separately.</span></div>
        </>}
  </div>
}

function InfoIcon() {
  return <span aria-hidden="true" className="comparison-note-icon">i</span>
}
