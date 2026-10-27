import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, api, getToken, setToken } from '../api'

const EMPTY = { players: {}, points: 0, winnings: 0, history: [], registrations: [] }

const AppContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

// The account (balance, game IDs, history, registrations) lives on the server.
// Every action calls the API, which returns the fresh account state.
export function AppProvider({ children }) {
  const [account, setAccount] = useState(null) // { user, points, winnings, players, history, registrations }
  const [ready, setReady] = useState(!getToken())
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setAccount(null)
  }, [])

  const refresh = useCallback(async () => {
    try {
      setAccount(await api('/auth/me'))
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0) logout() // expired or suspended
    }
  }, [logout])

  // Restore the session on first load.
  useEffect(() => {
    if (!getToken()) return
    api('/auth/me')
      .then(setAccount)
      .catch((e) => {
        if (e instanceof ApiError && e.status !== 0) setToken(null) // expired or suspended
      })
      .finally(() => setReady(true))
  }, [])

  // Keep balances fresh (admin approvals, match results) while the tab is open.
  useEffect(() => {
    if (!account) return
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [Boolean(account), refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  // Run an API call that returns the new account state. Resolves to an error message, or null on success.
  const mutate = useCallback(async (path, body) => {
    try {
      const data = await api(path, { method: 'POST', body })
      if (data.user) setAccount(data)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: e.message }
    }
  }, [])

  const authenticate = useCallback(
    async (path, body) => {
      try {
        const { token, ...state } = await api(path, { method: 'POST', body })
        setToken(token)
        setAccount(state)
        return null
      } catch (e) {
        return e.message
      }
    },
    [],
  )

  const register = useCallback((v) => authenticate('/auth/register', v), [authenticate])
  const login = useCallback((v) => authenticate('/auth/login', v), [authenticate])

  const signUp = useCallback((gameId, v) => mutate(`/games/${gameId}/signup`, v).then((r) => r.error), [mutate])

  const topUp = useCallback(
    async (gameId, packId, method, reference, screenshotId) => {
      const { data, error } = await mutate('/topups', { gameId, packId, method, reference, screenshotId })
      return { error, status: data?.status, credited: data?.credited }
    },
    [mutate],
  )

  const registerTeam = useCallback((tournamentId, team) => mutate(`/tournaments/${tournamentId}/register`, { team }).then((r) => r.error), [mutate])

  const redeem = useCallback((amount, method, accountNo) => mutate('/redeems', { amount, method, account: accountNo }).then((r) => r.error), [mutate])

  const state = account ?? EMPTY
  const user = account?.user ?? null

  const value = useMemo(
    () => ({ ...state, user, ready, toasts, toast, refresh, register, login, logout, signUp, topUp, registerTeam, redeem }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, ready, toasts, toast, refresh, register, login, logout, signUp, topUp, registerTeam, redeem],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
