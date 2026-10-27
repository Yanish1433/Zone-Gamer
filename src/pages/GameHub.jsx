import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import GameLogo from '../components/ui/GameLogo'
import TiltCard from '../components/ui/TiltCard'
import { useApp } from '../context/AppContext'
import { gradientOf } from '../data/games'
import { useGame } from '../hooks/useGame'
import GameHeader from '../sections/game/GameHeader'

export default function GameHub() {
  const { game, player } = useGame()
  const { points } = useApp()

  const modes = [
    { to: '1v1', icon: '⚔️', title: '1v1 Arena', text: 'Stake points against another gamer. Winner takes the pot.' },
    { to: 'wallet', icon: '💳', title: 'Top-up', text: 'Buy game points and see your history.' },
    { to: '/redeem', icon: '🎁', title: 'Redeem', text: 'Redeem your combined points from every game.' },
    ...(game.hasTournament
      ? [{ to: 'tournament', icon: '🏆', title: 'Full-Map Tournament', text: 'Register your squad and fight for the prize pool.' }]
      : []),
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <GameHeader game={game} back={false} title={game.name} subtitle={game.tagline} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="size-14 overflow-hidden rounded-xl">
            <GameLogo game={game} />
          </div>
          <div>
            <p className="font-display text-lg font-bold">{player.name}</p>
            <p className="text-white/50">
              {game.idLabel}: {player.uid}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-wider text-white/50">Game points</p>
          <p className="font-display text-3xl font-black">
            🪙 <AnimatedNumber value={points} />
          </p>
        </div>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {modes.map((m, i) => (
          <motion.div
            key={m.to}
            initial={{ opacity: 0, y: 50, rotateX: -20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 110, damping: 16 }}
            style={{ perspective: 1000 }}
          >
            <Link to={m.to} className="block">
              <TiltCard glow={game.colors.glow} className="glass h-full rounded-3xl p-7">
                <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl" style={{ background: gradientOf(game, 90) }} />
                <motion.div className="text-6xl [transform:translateZ(60px)]" animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.5 }}>
                  {m.icon}
                </motion.div>
                <h2 className="mt-5 font-display text-2xl font-black uppercase [transform:translateZ(30px)]">{m.title}</h2>
                <p className="mt-2 text-lg text-white/60">{m.text}</p>
                <p className="mt-6 font-display text-xs font-bold uppercase tracking-widest" style={{ color: game.colors.from }}>
                  Open →
                </p>
              </TiltCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
