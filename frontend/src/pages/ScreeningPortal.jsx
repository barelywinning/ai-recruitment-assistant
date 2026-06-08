import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, Briefcase, Brain, CheckCircle,
  AlertCircle, ChevronRight, Download, Loader2,
  Sparkles, X,
} from 'lucide-react'
import { uploadResume, downloadReport, getAgentLogs } from '../utils/api'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 'upload', label: 'Upload Resume', icon: Upload },
  { id: 'screening', label: 'Resume Screening', icon: FileText },
  { id: 'matching', label: 'Job Matching', icon: Briefcase },
  { id: 'ranking', label: 'Candidate Ranking', icon: Brain },
  { id: 'interview', label: 'Interview Gen', icon: Sparkles },
]



export default function ScreeningPortal() {
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [result, setResult] = useState(null)
  const [logs, setLogs] = useState([])
  const fileRef = useRef(null)

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
    } else {
      toast.error('Please upload a PDF file')
    }
  }, [])

  const handleDragOver = useCallback(e => { e.preventDefault(); setDragging(true) }, [])
  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleFileChange = e => {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  const runPipeline = async () => {
    if (!file) return toast.error('Please upload a resume PDF')
    if (!jobDescription.trim() || jobDescription.length < 20) {
      return toast.error('Please enter a job description (at least 20 characters)')
    }

    setLoading(true)
    setResult(null)
    setCurrentStep(1)

    // Simulate step progression
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
    }, 3000)

    try {
      const res = await uploadResume(file, jobDescription)
      clearInterval(stepTimer)
      setCurrentStep(STEPS.length)
      setResult(res.data)

      // Load agent logs
      try {
        const logRes = await getAgentLogs(res.data.candidate_id)
        setLogs(logRes.data.logs || [])
      } catch {}

      toast.success(`✅ Evaluation complete! Candidate: ${res.data.screening?.candidate_name}`)
    } catch (err) {
      clearInterval(stepTimer)
      setCurrentStep(0)
      toast.error('Pipeline error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!result?.candidate_id) return
    try {
      const res = await downloadReport(result.candidate_id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${result.screening?.candidate_name?.replace(/\s/g, '_') || 'candidate'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF report downloaded!')
    } catch {
      toast.error('Failed to download report')
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }} className="animate-fadeIn">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
          <span className="gradient-text">Candidate Screening Portal</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Upload a resume and run the full AI evaluation pipeline
        </p>
      </div>

      {/* Pipeline Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '32px' }}>
        {STEPS.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: i < currentStep
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : i === currentStep
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'var(--bg-elevated)',
                border: `2px solid ${i < currentStep ? '#10b981' : i === currentStep ? '#6366f1' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.5s ease',
                boxShadow: i === currentStep && loading ? '0 0 20px rgba(99,102,241,0.5)' : 'none',
              }}>
                {i < currentStep
                  ? <CheckCircle size={18} color="white" />
                  : i === currentStep && loading
                    ? <Loader2 size={18} color="white" className="animate-spin" />
                    : <step.icon size={16} color={i <= currentStep ? 'white' : 'var(--text-muted)'} />
                }
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                color: i <= currentStep ? 'var(--text-primary)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                background: i < currentStep
                  ? 'linear-gradient(90deg, #10b981, #6366f1)'
                  : 'var(--border)',
                margin: '-16px 8px 0',
                transition: 'all 0.5s ease',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Input Section */}
      {!result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* PDF Upload */}
          <div>
            <div className="section-label" style={{ marginBottom: '12px' }}>Resume PDF</div>
            <div
              className={`drop-zone ${dragging ? 'drag-active' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !file && fileRef.current?.click()}
              style={{ cursor: file ? 'default' : 'pointer', padding: '36px' }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {file ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'rgba(99,102,241,0.15)',
                    border: '2px solid rgba(99,102,241,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <FileText size={26} color="#818cf8" />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                  >
                    <X size={12} /> Remove
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Upload size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Drop PDF here or click to browse
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Maximum file size: 10MB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div>
            <div className="section-label" style={{ marginBottom: '12px' }}>Job Description</div>
            <textarea
              className="input-field"
              style={{ minHeight: '240px', resize: 'vertical' }}
              placeholder="Paste the job description here...

Example:
We are looking for a Senior Full-Stack Engineer with 5+ years of experience in React, Node.js, and cloud platforms (AWS/GCP). The ideal candidate should have experience with microservices architecture, Docker, Kubernetes, and CI/CD pipelines..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {jobDescription.length} characters
            </div>
          </div>
        </div>
      )}

      {!result && (
        <button
          className="btn-primary"
          onClick={runPipeline}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> Running AI Pipeline...</>
          ) : (
            <><Sparkles size={20} /> Run Full AI Evaluation</>
          )}
        </button>
      )}

      {/* Results */}
      {result && <Results result={result} logs={logs} onReset={() => { setResult(null); setCurrentStep(0); setFile(null); setJobDescription('') }} onDownload={handleDownloadReport} />}
    </div>
  )
}

function Results({ result, logs, onReset, onDownload }) {
  const { screening, matching, ranking, interview_questions, interview_slots } = result

  return (
    <div className="animate-fadeInUp">
      {/* Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px 20px',
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle size={20} color="#10b981" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#34d399' }}>
              Evaluation Complete
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Pipeline ran in {result.pipeline_duration_seconds}s • ID: #{result.candidate_id}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={onDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}>
            <Download size={15} /> PDF Report
          </button>
          <button className="btn-primary" onClick={onReset} style={{ padding: '10px 18px', fontSize: '13px' }}>
            New Evaluation
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Candidate Profile */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Candidate Profile
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <ProfileRow label="Name" value={screening?.candidate_name} />
            <ProfileRow label="Email" value={screening?.email || '—'} />
            <ProfileRow label="Phone" value={screening?.phone || '—'} />
          </div>
          <div className="section-label">Skills ({screening?.skills?.length || 0})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {screening?.skills?.slice(0, 12).map((s, i) => (
              <span key={i} className="skill-chip">{s}</span>
            ))}
            {(screening?.skills?.length || 0) > 12 && (
              <span className="skill-chip">+{screening.skills.length - 12} more</span>
            )}
          </div>
        </div>

        {/* Match Score */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Job Match Analysis
          </h3>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{
              fontSize: '56px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
            }}>
              {matching?.match_score?.toFixed(0)}%
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Match Score</div>
          </div>
          <div className="progress-bar" style={{ marginBottom: '20px' }}>
            <div className="progress-fill" style={{ width: `${matching?.match_score || 0}%` }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div className="section-label" style={{ marginBottom: '6px' }}>Matching Skills</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {matching?.matching_skills?.slice(0, 4).map((s, i) => (
                  <span key={i} className="skill-chip skill-chip-match" style={{ display: 'block', width: 'fit-content' }}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="section-label" style={{ marginBottom: '6px' }}>Missing Skills</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {matching?.missing_skills?.slice(0, 4).map((s, i) => (
                  <span key={i} className="skill-chip skill-chip-missing" style={{ display: 'block', width: 'fit-content' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking + Strengths/Weaknesses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Hiring Decision
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--text-primary)' }}>
              {ranking?.hiring_score?.toFixed(0)}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/100 Hiring Score</div>
              <RecommendationBadge rec={ranking?.recommendation} />
            </div>
          </div>
          <div className="progress-bar" style={{ marginBottom: '16px' }}>
            <div className="progress-fill" style={{ width: `${ranking?.hiring_score || 0}%` }} />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {ranking?.reasoning}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Strengths & Weaknesses
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
              ✓ Strengths
            </div>
            {matching?.strengths?.map((s, i) => (
              <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {s}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>
              ✗ Areas for Improvement
            </div>
            {matching?.weaknesses?.map((w, i) => (
              <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {w}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interview Questions */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
          Generated Interview Questions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {[
            { key: 'technical', label: '💻 Technical', color: '#6366f1' },
            { key: 'hr', label: '👥 HR & Culture', color: '#8b5cf6' },
            { key: 'project_based', label: '🚀 Project-Based', color: '#10b981' },
            { key: 'follow_up', label: '🔍 Follow-up', color: '#f59e0b' },
          ].map(({ key, label, color }) => (
            <div key={key}>
              <div style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '10px' }}>
                {label}
              </div>
              {interview_questions?.[key]?.map((q, i) => (
                <div key={i} className="question-card" style={{ borderLeftColor: color }}>
                  <span style={{ color, fontWeight: 600, marginRight: '6px' }}>Q{i + 1}.</span>
                  {q}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Interview Schedule */}
      {interview_slots?.length > 0 && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            Proposed Interview Schedule
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {interview_slots.map((slot, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '8px' }}>
                  Round {slot.round}: {slot.round_name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                  📅 {slot.date} at {slot.time}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ⏱ {slot.duration} • {slot.mode}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  👤 {slot.interviewer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Logs */}
      {logs.length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Agent Communication Log
          </h3>
          {logs.map((log, i) => (
            <div key={i} className="timeline-item" style={{ marginBottom: '16px' }}>
              <div className="timeline-dot" />
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    {log.from_agent}
                  </span>
                  <ChevronRight size={12} color="var(--text-muted)" />
                  <span style={{ fontSize: '11px', background: 'rgba(139,92,246,0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    {log.to_agent}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
      <span style={{ color: 'var(--text-muted)', minWidth: '60px', fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
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
  return <span className={map[rec] || 'badge'} style={{ marginTop: '4px', display: 'inline-block' }}>{rec}</span>
}
