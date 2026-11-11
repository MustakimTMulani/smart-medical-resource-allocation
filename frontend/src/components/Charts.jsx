import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)
const colors = { teal: '#0D9488', blue: '#2563EB', slate: '#64748B', grid: '#E2E8F0', text: '#64748B' }
const tooltip = { backgroundColor: '#172B4D', padding: 11, titleFont: { weight: 600 }, bodyFont: { size: 12 }, displayColors: true, boxPadding: 4, cornerRadius: 6 }
const legend = { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 16, color: colors.text, font: { size: 11 } } }

export function BudgetTrendChart() {
  const data = { labels: ['May 05', 'May 12', 'May 19', 'May 26', 'Jun 02', 'Jun 09', 'Jun 16'], datasets: [
    { label: 'Allocated', data: [32, 45, 40, 58, 52, 68, 62], borderColor: colors.teal, backgroundColor: 'rgba(13,148,136,.07)', fill: true, tension: .32, pointRadius: 2, pointBackgroundColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 4 },
    { label: 'Available', data: [68, 55, 60, 42, 48, 32, 38], borderColor: colors.blue, backgroundColor: 'transparent', borderDash: [4, 4], tension: .32, pointRadius: 0, pointHoverRadius: 4 },
  ] }
  const options = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend, tooltip }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: colors.text, font: { size: 10 }, maxRotation: 0 } }, y: { min: 0, max: 100, border: { display: false }, grid: { color: colors.grid }, ticks: { color: colors.text, font: { size: 10 }, callback: (value) => `${value}%`, stepSize: 25 } } } }
  return <Line data={data} options={options} />
}

export function AlgorithmMixChart() {
  const data = { labels: ['Dynamic programming', 'Greedy heuristic', 'Divide & conquer'], datasets: [{ data: [54, 31, 15], backgroundColor: [colors.teal, colors.blue, '#94A3B8'], borderWidth: 0, hoverOffset: 3, spacing: 3, borderRadius: 3 }] }
  const options = { responsive: true, maintainAspectRatio: false, cutout: '76%', plugins: { legend: { display: false }, tooltip } }
  return <Doughnut data={data} options={options} />
}

export function ComparisonChart({ labels, datasets, unit = 'ms', beginAtZero = true }) {
  const palette = [colors.blue, colors.slate, colors.teal]
  const data = { labels, datasets: datasets.map((dataset, index) => ({ label: dataset.label, data: dataset.data, backgroundColor: palette[index], borderColor: palette[index], borderWidth: 0, borderRadius: 4, maxBarThickness: 30 })) }
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend, tooltip }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: colors.text, font: { size: 10 } } }, y: { beginAtZero, border: { display: false }, grid: { color: colors.grid }, ticks: { color: colors.text, font: { size: 10 }, callback: (value) => `${value} ${unit}` } } } }
  return <Bar data={data} options={options} />
}

export function QualityChart({ labels, datasets, min = 0, max = 100 }) {
  const palette = [colors.blue, colors.slate, colors.teal]
  const data = { labels, datasets: datasets.map((dataset, index) => ({ label: dataset.label, data: dataset.data, borderColor: palette[index], backgroundColor: palette[index], pointRadius: 2, pointHoverRadius: 4, tension: .3 })) }
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend, tooltip }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: colors.text, font: { size: 10 } } }, y: { min, max, border: { display: false }, grid: { color: colors.grid }, ticks: { color: colors.text, font: { size: 10 }, callback: (value) => `${value}%` } } } }
  return <Line data={data} options={options} />
}
