import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useGame } from '../../hooks/useGame'

// Unknown game ids go home.
export function GameGuard() {
  const { game } = useGame()
  return game ? <Outlet /> : <Navigate to="/" replace />
}

// Game pages (hub, 1v1, wallet, tournaments) need a game ID, so send new players to signup.
export function PlayerGuard() {
  const { game, player } = useGame()
  return player ? <Outlet /> : <Navigate to={`/game/${game.id}/signup`} replace />
}

// Tournaments exist for PUBG and Free Fire only.
export function TournamentGuard() {
  const { game } = useGame()
  return game.hasTournament ? <Outlet /> : <Navigate to={`/game/${game.id}`} replace />
}

// Points, games and rewards belong to an account, so send logged-out visitors to log in first.
export function AuthGuard() {
  const { user, ready } = useApp()
  const location = useLocation()
  if (!ready) return null // still restoring the session
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}
