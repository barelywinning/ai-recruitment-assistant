import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSearch,
  Calendar,
  Trophy,
  Bot,
  Zap,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/screening', icon: FileSearch, label: 'Candidate Screening' },
  { to: '/interview', icon: Calendar, label: 'Interview Scheduler' },
  { to: '/ranking', icon: Trophy, label: 'Candidate Ranking' },
]

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }} className="bg-mesh">
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        minWidth: '260px',
        background: 'rgba(26, 24, 40, 0.95)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '40px', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ea580c, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 18px rgba(234,88,12,0.4)',
            }}>
              <Bot size={22} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1.2, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em' }}>
                RecruitAI
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Powered by Gemini
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <div className="section-label" style={{ marginBottom: '12px', paddingLeft: '8px' }}>
            Navigation
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              style={{ marginBottom: '4px', display: 'flex' }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Status */}
        <div style={{
          background: 'rgba(234, 88, 12, 0.07)',
          border: '1px solid rgba(234, 88, 12, 0.18)',
          borderRadius: '10px',
          padding: '13px',
          marginTop: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#4ade80',
              animation: 'pulse-glow 2s infinite',
            }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fb923c', fontFamily: "'Space Grotesk', sans-serif" }}>
              AI Agents Online
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            4 agents • 3 MCP servers
          </div>
        </div>

        {/* Gemini badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 8px 0',
          marginTop: '12px',
        }}>
          <Zap size={12} color="var(--text-muted)" />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Gemini 1.5 Flash
          </span>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflowX: 'hidden', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}
