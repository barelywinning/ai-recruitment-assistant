import { useEffect, useState } from 'react'
import {
  Users, TrendingUp, Award, Brain,
  RefreshCw, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getDashboard, getCandidates, getAgentLogs } from '../utils/api'
import toast from 'react-hot-toast'

const COLORS = ['#4ade80', '#22d3ee', '#facc15', '#f87171']
const REC_ORDER = ['Strong Hire', 'Hire', 'Consider', 'Reject']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
      }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</div>
        <div style={{ color: '#fb923c', marginTop: 4 }}>
          {payload[0]?.value} candidate{payload[0]?.value !== 1 ? 's' : ''}
        </div>
      </div>
    )
  }
  return null
}

const RecommendationBadge = ({ rec }) => {
  const classes = {
    'Strong Hire': 'badge badge-strong-hire',
    'Hire': 'badge badge-hire',
    'Consider': 'badge badge-consider',
    'Reject': 'badge badge-reject',
  }
  return <span className={classes[rec] || 'badge'}>{rec}</span>
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashRes, logRes] = await Promise.all([
        getDashboard(),
        getAgentLogs(),
      ])
      setStats(dashRes.data)
      setLogs(logRes.data.logs || [])
    } catch (err) {
      toast.error('Failed to load dashboard: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const pieData = stats
    ? REC_ORDER
        .filter(r => stats.recommendation_breakdown?.[r])
        .map((r, i) => ({
          name: r,
          value: stats.recommendation_breakdown[r],
          color: COLORS[i],
        }))
    : []

  const statCards = [
    {
      icon: Users,
      label: 'Total Candidates',
      value: stats?.total_candidates ?? '—',
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.1)',
    },
    {
      icon: TrendingUp,
      label: 'Average Match Score',
      value: stats ? `${stats.average_match_score}%` : '—',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)',
    },
    {
      icon: Award,
      label: 'Strong Hire',
      value: stats?.recommendation_breakdown?.['Strong Hire'] ?? 0,
      color: '#34d399',
      bg: 'rgba(16,185,129,0.1)',
    },
    {
      icon: Brain,
      label: 'AI Evaluations',
      value: stats?.total_candidates ?? '—',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.1)',
    },
  ]

  if (loading) return <DashboardSkeleton />

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }} className="animate-fadeIn">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
            <span className="gradient-text">Recruiter Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            AI-powered recruitment intelligence at a glance
          </p>
        </div>
        <button className="btn-secondary" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: card.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <card.icon size={22} color={card.color} />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        {/* Score Distribution */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            Candidate Score Distribution
          </h3>
          {stats?.score_distribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.score_distribution} barSize={36}>
                <XAxis dataKey="range" tick={{ fill: '#a8a4c8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a8a4c8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No candidate data yet. Upload resumes to get started." />
          )}
        </div>

        {/* Recommendation Breakdown */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            Hiring Recommendation Breakdown
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>
                  )}
                />
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '13px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Process candidates to see recommendation distribution." />
          )}
        </div>
      </div>

      {/* Bottom Row: Top Candidates + Agent Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top Candidates */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            Top Ranked Candidates
          </h3>
          {stats?.top_candidates?.length > 0 ? (
            <div>
              {stats.top_candidates.map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 0',
                  borderBottom: i < stats.top_candidates.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${COLORS[i % 4]}33, ${COLORS[i % 4]}22)`,
                    border: `1px solid ${COLORS[i % 4]}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: COLORS[i % 4],
                    flexShrink: 0,
                  }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {c.candidate_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Score: {c.hiring_score?.toFixed(0)}/100
                    </div>
                  </div>
                  <RecommendationBadge rec={c.recommendation} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message="No candidates evaluated yet." />
          )}
        </div>

        {/* Agent Communication Timeline */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            Agent Communication Timeline
          </h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {logs.length > 0 ? (
              logs.slice(0, 10).map((log, i) => (
                <div key={log.id || i} className="agent-log-entry animate-fadeInUp" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '11px',
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 600,
                    }}>
                      {log.from_agent}
                    </span>
                    <ChevronRight size={12} color="var(--text-muted)" />
                    <span style={{
                      fontSize: '11px',
                      background: 'rgba(139,92,246,0.15)',
                      color: '#c084fc',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 600,
                    }}>
                      {log.to_agent}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {log.message}
                  </p>
                </div>
              ))
            ) : (
              <EmptyChart message="Agent logs will appear here after processing candidates." />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyChart({ message }) {
  return (
    <div style={{
      height: '160px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '8px',
      color: 'var(--text-muted)',
      fontSize: '13px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '32px' }}>📊</div>
      {message}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div style={{ padding: '32px' }}>
      <div className="skeleton" style={{ height: '36px', width: '280px', marginBottom: '32px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', marginBottom: '32px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '16px' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="skeleton" style={{ height: '280px', borderRadius: '16px' }} />
        <div className="skeleton" style={{ height: '280px', borderRadius: '16px' }} />
      </div>
    </div>
  )
}
