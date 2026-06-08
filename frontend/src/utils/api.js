import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 min for AI pipeline
})

api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.detail || err.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export const uploadResume = (file, jobDescription) => {
  const form = new FormData()
  form.append('file', file)
  form.append('job_description', jobDescription)
  return api.post('/upload_resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getCandidates = (params = {}) =>
  api.get('/candidates', { params })

export const getCandidate = (id) => api.get(`/candidates/${id}`)

export const getDashboard = () => api.get('/dashboard')

export const getAgentLogs = (candidateId) =>
  api.get('/agent_logs', { params: candidateId ? { candidate_id: candidateId } : {} })

export const generateInterview = (candidateId) =>
  api.post(`/generate_interview?candidate_id=${candidateId}`)

export const downloadReport = (candidateId) =>
  api.get(`/report/${candidateId}`, { responseType: 'blob' })

export const checkHealth = () => axios.get('/health')

export default api
