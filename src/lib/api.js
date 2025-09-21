import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

export async function get(path, params) {
  const res = await api.get(path, { params })
  return res.data
}

export async function post(path, data) {
  const res = await api.post(path, data)
  return res.data
}

export async function patch(path, data) {
  const res = await api.patch(path, data)
  return res.data
}

export async function del(path) {
  const res = await api.delete(path)
  return res.data
}

export { api }
