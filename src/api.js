// Thin fetch wrapper for the backend. In dev, Vite proxies /api to the server (see vite.config.js).
const TOKEN_KEY = 'zonegamer.token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage blocked: the session just won't survive a reload
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong', res.status)
  return data
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// Client-side check so people get a quick message; the server checks again.
export const imageProblem = (file) => {
  if (!file) return 'Choose a screenshot first'
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a PNG, JPG or WebP image'
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be under 5 MB'
  return null
}

// Upload a proof screenshot ('topup' or 'match'). Resolves to the upload id.
export async function uploadImage(file, purpose) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/uploads?purpose=${purpose}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: file,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Upload failed', res.status)
  return data.id
}
