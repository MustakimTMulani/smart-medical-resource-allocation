import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, CircleHelp, Menu, Plus, X } from 'lucide-react'
import { navigation } from '../data/mockData'
import ApiConnectionStatus from './ApiConnectionStatus'

const pageMeta = {
  '/': ['Overview', 'Monitor inventory, allocations, and algorithm performance.'],
  '/inventory': ['Medical inventory', 'Manage and monitor the resources available across your facility.'],
  '/allocation': ['Resource allocation', 'Build a budget-aware resource plan for your care teams.'],
  '/algorithms': ['Algorithm comparison', 'Compare how each strategy allocates resources against your budget.'],
  '/performance': ['Performance analysis', 'Explore speed, memory, and solution quality as datasets grow.'],
  '/about': ['About the project', 'A comparative study of algorithm design for healthcare planning.'],
}

function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark"><Plus size={19} strokeWidth={2.6} /></div>
      <div>
        <div className="brand-name">Med<span>Alloc</span></div>
        <div className="brand-caption">RESOURCE MANAGEMENT</div>
      </div>
    </div>
  )
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const [title, subtitle] = pageMeta[location.pathname] || pageMeta['/']
  const currentYear = new Date().getFullYear()

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={19} /></button>
        </div>

        <div className="facility-switch">
          <div className="facility-icon">ST</div>
          <div className="facility-copy"><strong>St. Thomas Medical</strong><span>Central facility</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <NavLink className="help-card" to="/about" onClick={() => setMenuOpen(false)}>
            <span className="help-icon"><CircleHelp size={16} /></span>
            <span><strong>Project guide</strong><small>Problem, objectives, and methods</small></span>
            <span className="help-arrow">↗</span>
          </NavLink>
          <div className="profile-row">
            <div className="avatar">AM</div>
            <div className="profile-copy"><strong>Dr. Ananya Mehta</strong><span>Resource manager</span></div>
            <button className="icon-button profile-menu" aria-label="Profile menu"><ChevronDown size={16} /></button>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="topbar-title">
            <div className="eyebrow">SMART MEDICAL RESOURCE ALLOCATION <span>/</span> {title.toUpperCase()}</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <ApiConnectionStatus />
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <div className="top-avatar" aria-label="Dr. Ananya Mehta">AM</div>
          </div>
        </header>

        <div className="page-content"><Outlet /></div>
        <footer className="page-footer">
          <span>© {currentYear} MedAlloc · Smart Medical Resource Allocation System</span>
          <span>Healthcare resource planning</span>
        </footer>
      </main>
    </div>
  )
}
