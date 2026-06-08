import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ScreeningPortal from './pages/ScreeningPortal'
import InterviewScheduler from './pages/InterviewScheduler'
import CandidateRanking from './pages/CandidateRanking'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="screening" element={<ScreeningPortal />} />
        <Route path="interview" element={<InterviewScheduler />} />
        <Route path="ranking" element={<CandidateRanking />} />
      </Route>
    </Routes>
  )
}
