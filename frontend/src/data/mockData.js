import {
  Activity, Boxes, ClipboardList, LayoutDashboard, Microscope,
  ShieldPlus, Sparkles, ChartNoAxesCombined, CircleHelp,
} from 'lucide-react'

export const navigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Medical inventory', path: '/inventory', icon: Boxes },
  { label: 'Resource allocation', path: '/allocation', icon: ClipboardList },
  { label: 'Algorithm comparison', path: '/algorithms', icon: Microscope },
  { label: 'Performance analysis', path: '/performance', icon: ChartNoAxesCombined },
  { label: 'About project', path: '/about', icon: CircleHelp },
]

export const resources = [
  { id: 'MED-001', name: 'ICU ventilator', category: 'Critical care', cost: 185000, priority: 98, status: 'Available', quantity: 8, location: 'Critical care' },
  { id: 'MED-002', name: 'Patient monitor', category: 'Monitoring', cost: 72000, priority: 91, status: 'Available', quantity: 14, location: 'ICU' },
  { id: 'MED-003', name: 'Defibrillator', category: 'Emergency', cost: 96000, priority: 95, status: 'Allocated', quantity: 6, location: 'Emergency' },
  { id: 'MED-004', name: 'Infusion pump', category: 'Critical care', cost: 38500, priority: 82, status: 'Available', quantity: 22, location: 'Surgical ward' },
  { id: 'MED-005', name: 'Portable ultrasound', category: 'Diagnostics', cost: 245000, priority: 76, status: 'Available', quantity: 4, location: 'Radiology' },
  { id: 'MED-006', name: 'Oxygen concentrator', category: 'Respiratory', cost: 52000, priority: 88, status: 'Maintenance', quantity: 11, location: 'Respiratory care' },
  { id: 'MED-007', name: 'Emergency medicine kit', category: 'Emergency', cost: 12800, priority: 86, status: 'Available', quantity: 35, location: 'Emergency' },
  { id: 'MED-008', name: 'Dialysis machine', category: 'Renal care', cost: 315000, priority: 72, status: 'Allocated', quantity: 3, location: 'Renal unit' },
]

export const activities = [
  { id: 'ACT-2048', action: 'Allocation completed', resource: 'ICU ventilators', detail: 'Critical care · 2 units', time: 'Today, 10:42 AM', tone: 'green' },
  { id: 'ACT-2047', action: 'Inventory updated', resource: 'Patient monitors', detail: 'Monitoring · +4 units', time: 'Today, 9:18 AM', tone: 'blue' },
  { id: 'ACT-2046', action: 'Comparison run', resource: 'Dynamic Programming', detail: 'Budget ₹5,00,000', time: 'Yesterday, 4:36 PM', tone: 'violet' },
  { id: 'ACT-2045', action: 'Resource added', resource: 'Emergency medicine kit', detail: 'Emergency · 12 units', time: 'Yesterday, 2:12 PM', tone: 'amber' },
]

export const algorithmSummaries = [
  { name: 'Divide and Conquer', short: 'Exhaustive search', description: 'Explores include and exclude choices to find the best allocation.', time: '24.8 ms', memory: '1.8 MB', color: 'blue', icon: Microscope },
  { name: 'Greedy', short: 'Fast heuristic', description: 'Ranks resources by priority per cost for a quick feasible solution.', time: '3.2 ms', memory: '0.6 MB', color: 'amber', icon: Sparkles },
  { name: 'Dynamic Programming', short: 'Optimal solution', description: 'Uses subproblem results to guarantee the highest priority score.', time: '8.6 ms', memory: '2.4 MB', color: 'green', icon: ShieldPlus },
]

export const performanceBySize = {
  10: { time: [0.5, 0.2, 0.3], memory: [0.3, 0.2, 0.4], quality: [100, 92, 100] },
  15: { time: [2.1, 0.3, 0.6], memory: [0.6, 0.3, 0.7], quality: [100, 94, 100] },
  20: { time: [9.8, 0.4, 1.1], memory: [1.0, 0.4, 1.2], quality: [100, 91, 100] },
  25: { time: [43.5, 0.5, 1.8], memory: [1.6, 0.5, 1.9], quality: [100, 96, 100] },
  30: { time: [188.0, 0.7, 2.7], memory: [2.2, 0.6, 2.8], quality: [100, 93, 100] },
}

export const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount)


