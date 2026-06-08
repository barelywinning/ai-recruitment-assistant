import { useState, useEffect } from 'react'
import {
  Search, Filter, RefreshCw, Download, Trophy,
  ChevronDown, ChevronUp, User,
} from 'lucide-react'
import { getCandidates, downloadReport } from '../utils/api'
import toast from 'react-hot-toast'

const RECOMMENDATIONS = ['All', 'Strong Hire', 'Hire', 'Consider', 'Reject']

const SCORE_COLOR = (score) => {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#3b82f6'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function RecommendationBadge({ rec }) {
  const map = {
    'Strong Hire': 'badge badge-strong-hire',
    'Hire': 'badge badge-hire',
    'Consider': 'badge badge-consider',
    'Reject': 'badge badge-reject',
  }
  return <span className={map[rec] || 'badge'}>{rec}</span>
}

function ScoreRing({ score, size = 60, color }) {
  const radius = (size - 8) / 2
  const circ = 2 * Math.PI * radius
  const dash = (score / 100) * circ
  const c = color || SCORE_COLOR(score)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={c} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        fill="var(--text-primary)"
        fontSize={size * 0.22}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ transform: `rotate(90deg) translate(0, -${size}px)`, transformOrigin: 'center' }}
      >
        {Math.round(score)}
      </text>
    </svg>
  )
}

export default function CandidateRanking() {
  const [candidates, setCandidates] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [recFilter, setRecFilter] = useState('All')
  const [sortBy, setSortBy] = useState('hiring_score')
  const [sortDir, setSortDir] = useState('desc')
  const [expanded, setExpanded] = useState(null)

  const loadCandidates = async () => {
    setLoading(true)
    try {
      const res = await getCandidates()
      setCandidates(res.data.candidates || [])
    } catch (err) {
      toast.error('Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCandidates() }, [])

  useEffect(() => {
    let data = [...candidates]

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(c =>
        c.candidate_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
    }

    if (recFilter !== 'All') {
      data = data.filter(c => c.recommendation === recFilter)
    }

    data.sort((a, b) => {
      const va = a[sortBy] ?? -1
      const vb = b[sortBy] ?? -1
      return sortDir === 'desc' ? vb - va : va - vb
    })

    setFiltered(data)
  }, [candidates, search, recFilter, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const handleDownload = async (id, name) => {
    try {
      const res = await downloadReport(id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${name?.replace(/\s/g, '_') || id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded!')
    } catch {
      toast.error('Download failed')
    }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown size={13} style={{ opacity: 0.3 }} />
    return sortDir === 'desc' ? <ChevronDown size={13} /> : <ChevronUp size={13} />
  }

  return (
    <div style={{ padding: '32px' }} className="animate-fadeIn">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
          <span className="gradient-text">Candidate Ranking</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Compare and rank all evaluated candidates
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: '42px' }}
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {RECOMMENDATIONS.map(r => (
            <button
              key={r}
              onClick={() => setRecFilter(r)}
              style={{
                padding: '8px 14px',
                borderRadius: '100px',
                border: `1px solid ${recFilter === r ? '#6366f1' : 'var(--border)'}`,
                background: recFilter === r ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: recFilter === r ? '#818cf8' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s ease',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <button className="btn-secondary" onClick={loadCandidates} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '13px' }}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        {['Strong Hire', 'Hire', 'Consider', 'Reject'].map(r => {
          const count = candidates.filter(c => c.recommendation === r).length
          const colors = { 'Strong Hire': '#10b981', 'Hire': '#3b82f6', 'Consider': '#f59e0b', 'Reject': '#ef4444' }
          return (
            <div key={r} style={{
              flex: 1,
              background: `${colors[r]}11`,
              border: `1px solid ${colors[r]}33`,
              borderRadius: '12px',
              padding: '12px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: colors[r] }}>{count}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{r}</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}>#</th>
              <th>Candidate</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('match_score')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Match Score <SortIcon col="match_score" />
                </span>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('hiring_score')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Hiring Score <SortIcon col="hiring_score" />
                </span>
              </th>
              <th>Recommendation</th>
              <th>Top Skills</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  Loading candidates...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                    <Trophy size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                    {search || recFilter !== 'All' ? 'No candidates match your filters' : 'No candidates evaluated yet'}
                  </div>
                </td>
              </tr>
            ) : filtered.map((c, idx) => (
              <>
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: idx < 3 ? 'rgba(99,102,241,0.2)' : 'transparent',
                      border: `1px solid ${idx < 3 ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: idx < 3 ? '#818cf8' : 'var(--text-muted)',
                    }}>
                      {idx + 1}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(99,102,241,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <User size={16} color="#818cf8" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{c.candidate_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="progress-bar" style={{ width: '80px' }}>
                        <div className="progress-fill" style={{
                          width: `${c.match_score || 0}%`,
                          background: `linear-gradient(90deg, ${SCORE_COLOR(c.match_score || 0)}, ${SCORE_COLOR(c.match_score || 0)}aa)`,
                        }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: SCORE_COLOR(c.match_score || 0) }}>
                        {c.match_score?.toFixed(0) || '—'}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ScoreRing score={c.hiring_score || 0} size={52} color={SCORE_COLOR(c.hiring_score || 0)} />
                    </div>
                  </td>
                  <td><RecommendationBadge rec={c.recommendation} /></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                      {(c.skills || []).slice(0, 3).map((s, i) => (
                        <span key={i} className="skill-chip" style={{ fontSize: '11px' }}>{s}</span>
                      ))}
                      {(c.skills || []).length > 3 && (
                        <span className="skill-chip" style={{ fontSize: '11px' }}>+{c.skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn-secondary"
                      onClick={e => { e.stopPropagation(); handleDownload(c.id, c.candidate_name) }}
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={12} /> Report
                    </button>
                  </td>
                </tr>

                {/* Expanded Row */}
                {expanded === c.id && (
                  <tr key={`${c.id}-expanded`}>
                    <td colSpan={7} style={{ padding: '0' }}>
                      <div style={{
                        padding: '20px 24px',
                        background: 'rgba(99,102,241,0.04)',
                        borderTop: '1px solid rgba(99,102,241,0.15)',
                        borderBottom: '1px solid rgba(99,102,241,0.15)',
                        animation: 'fadeInUp 0.3s ease',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                          {/* Strengths */}
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
                              ✓ Strengths
                            </div>
                            {(c.strengths || []).slice(0, 3).map((s, i) => (
                              <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                {s}
                              </div>
                            ))}
                          </div>

                          {/* Weaknesses */}
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>
                              ✗ Weaknesses
                            </div>
                            {(c.weaknesses || []).slice(0, 3).map((w, i) => (
                              <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                {w}
                              </div>
                            ))}
                          </div>

                          {/* Reasoning */}
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '8px' }}>
                              📋 Reasoning
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              {c.reasoning || 'No reasoning provided.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Showing {filtered.length} of {candidates.length} candidates
      </div>
    </div>
  )
}
