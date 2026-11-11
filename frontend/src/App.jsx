import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Allocation from './pages/Allocation'
import Algorithms from './pages/Algorithms'
import Performance from './pages/Performance'
import About from './pages/About'

export default function App() {
  const [comparisonResponse, setComparisonResponse] = useState(null)

  return <Routes><Route element={<AppShell />}><Route index element={<Dashboard />} /><Route path="inventory" element={<Inventory />} /><Route path="allocation" element={<Allocation onComparisonComplete={setComparisonResponse} />} /><Route path="algorithms" element={<Algorithms comparisonResponse={comparisonResponse} />} /><Route path="performance" element={<Performance />} /><Route path="about" element={<About />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>
}
