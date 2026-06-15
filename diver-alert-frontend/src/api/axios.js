/**
 * src/api/axios.js
 *
 * Instance Axios préconfigurée pour tous les appels REST vers le backend.
 *
 * Intercepteur request  : attache le JWT depuis localStorage à chaque requête
 * Intercepteur response : redirige vers /login si le token est expiré (401)
 */

import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // http://localhost:5000/api
    timeout: 10_000,
    headers: { 'Content-Type': 'application/json' },
})

// ── Intercepteur requête ──────────────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// ── Intercepteur réponse ──────────────────────────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Token expiré ou révoqué → nettoyage et redirection forcée
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api