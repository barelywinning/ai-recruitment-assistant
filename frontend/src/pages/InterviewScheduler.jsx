import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Download, ChevronRight, Clock, User, Video } from 'lucide-react'
import { getCandidates, getCandidate, generateInterview, downloadReport } from '../utils/api'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { key: 'technical', label: '💻 Technical', color: '#6366f1' },
  { key: 'hr', label: '👥 HR & Culture', color: '#8b5cf6' },
  { key: 'project_based', label: '🚀 Project-Based', color: '#10b981' },
  { key: 'follow_up', label: '🔍 Follow-up', color: '#f59e0b' },
]

export default function InterviewScheduler() {
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activeCategory, setActiveCategory] = useState('technical')

  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = async () => {
    setLoading(true)
    try {
      const res = await getCandidates()
      const filtered = (res.data.candidates || []).filter(
        c => c.recommendation && c.recommendation !== 'Reject'
      )
      setCandidates(filtered)
    } catch (err) {
      toast.error('Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  const loadCandidate = async (id) => {
    setSelected(id)
    setLoading(true)
    try {
      const res = await getCandidate(id)
      setCandidate(res.data)
    } catch (err) {
      toast.error('Failed to load candidate details')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateQuestions = async () => {
    if (!selected) return
    setGenerating(true)
    try {
      await generateInterview(selected)
      const res = await getCandidate(selected)
      setCandidate(res.data)
      toast.success('Interview questions regenerated!')
    } catch (err) {
      toast.error('Failed to regenerate questions: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!selected) return
    try {
      const res = await downloadReport(selected)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `interview_${candidate?.candidate_name?.replace(/\s/g, '_') || 'candidate'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded!')
    } catch {
      toast.error('Download failed')
    }
  }

  const questions = candidate?.interview_questions || {}
  const slots = candidate?.interview_slots || []

  return (
    <div style={{ padding: '32px' }} className="animate-fadeIn">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
          <span className="gradient-text">Interview Scheduler</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          View interview questions and proposed schedules for qualified candidates
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Candidate List */}
        <div className="glass-card" style={{ padding: '16px', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Qualified Candidates
            </span>
            <button onClick={loadCandidates} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <RefreshCw size={14} />
            </button>
          </div>

          {candidates.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Calendar size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              No qualified candidates.<br />Process resumes in Screening Portal.
            </div>
          ) : (
            candidates.map(c => (
              <div
                key={c.id}
                onClick={() => loadCandidate(c.id)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: selected === c.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: `1px solid ${selected === c.id ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                  marginBottom: '4px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {c.candidate_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Match: {c.match_score?.toFixed(0)}%
                    </div>
                  </div>
                  <RecommendationBadge rec={c.recommendation} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {!candidate ? (
            <div style={{
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-muted)',
            }}>
              <Calendar size={56} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '15px' }}>Select a candidate to view their interview plan</p>
            </div>
          ) : (
            <div className="animate-fadeInUp">
              {/* Header */}
              <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {candidate.candidate_name}
                    </h2>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <span>Match: <strong style={{ color: '#818cf8' }}>{candidate.match_score?.toFixed(0)}%</strong></span>
                      <span>Score: <strong style={{ color: '#818cf8' }}>{candidate.hiring_score?.toFixed(0)}/100</strong></span>
                      <RecommendationBadge rec={candidate.recommendation} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn-secondary"
                      onClick={handleRegenerateQuestions}
                      disabled={generating}
                      style={{ fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
                      {generating ? 'Regenerating...' : 'Regenerate Questions'}
                    </button>
                    <button className="btn-primary" onClick={handleDownload} style={{ fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Download size={13} /> Download PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Interview Schedule */}
              {slots.length > 0 && (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    📅 Proposed Interview Schedule
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                    {slots.map((slot, i) => (
                      <div key={i} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px',
                        borderLeft: '3px solid #6366f1',
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '8px' }}>
                          Round {slot.round}: {slot.round_name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                            <Calendar size={13} color="#818cf8" />
                            {slot.date} at {slot.time}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <Clock size={12} />
                            {slot.duration}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <Video size={12} />
                            {slot.mode}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <User size={12} />
                            {slot.interviewer}
                          </div>
                        </div>
                        {slot.meeting_link && (
                          <a href={slot.meeting_link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '11px', color: '#6366f1', display: 'block', marginTop: '8px' }}>
                            Join Meeting →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Questions */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                  🎯 Interview Questions
                </h3>

                {/* Category Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '100px',
                        border: `1px solid ${activeCategory === cat.key ? cat.color : 'var(--border)'}`,
                        background: activeCategory === cat.key ? `${cat.color}22` : 'transparent',
                        color: activeCategory === cat.key ? cat.color : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Questions */}
                <div>
                  {CATEGORIES.map(cat => (
                    <div key={cat.key} style={{ display: activeCategory === cat.key ? 'block' : 'none' }}>
                      {(questions[cat.key] || []).map((q, i) => (
                        <div key={i} className="question-card" style={{ borderLeftColor: cat.color }}>
                          <span style={{ color: cat.color, fontWeight: 700, marginRight: '8px' }}>Q{i + 1}.</span>
                          {q}
                        </div>
                      ))}
                      {(!questions[cat.key] || questions[cat.key].length === 0) && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>
                          No questions generated yet. Click "Regenerate Questions".
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
