import { useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getGame } from '../data/games'

// Resolves the :gameId route param to its game config and the signed-up player (if any).
export function useGame() {
  const { gameId } = useParams()
  const { players } = useApp()
  return { game: getGame(gameId), player: players[gameId] }
}
