import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import TiltCard from '../components/ui/TiltCard'
import { useApp } from '../context/AppContext'
import { gradientOf } from '../data/games'
import { useGame } from '../hooks/useGame'
import GameHeader from '../sections/game/GameHeader'
import TopUp from '../sections/game/TopUp'

const TABS = [
  { id: 'topup', label: 'Top-up' },
  { id: 'history', label: 'History' },
]

function History({ game }) {
  const { history } = useApp()
  if (!history.length) return <p className="text-xl text-white/50">No activity yet.</p>
  return (
    <div className="space-y-2">
      {history.map((h, i) => (
        <motion.div key={h.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="glass flex items-center justify-between rounded-xl px-4 py-3">
          <div>
            <p className="font-semibold">{h.label}</p>
            <p className="text-sm text-white/40">
              {new Date(h.at).toLocaleString()} · {h.gameId === game.id ? game.short : h.gameId}
            </p>
          </div>
          <p className={`font-display font-bold ${h.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {h.delta >= 0 ? '+' : ''}
            {h.delta}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

export default function Wallet() {
  const { game, player } = useGame()
  const { points } = useApp()
  const [tab, setTab] = useState('topup')

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <GameHeader game={game} title="Top-up" subtitle="Buy game points and spend them in the arena. Only points you win can be redeemed." />

      <div style={{ perspective: 1000 }} className="mb-10">
        <TiltCard glow={game.colors.glow} max={6} className="overflow-hidden rounded-3xl p-8" style={{ background: gradientOf(game) }}>
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-black/60">Balance</p>
          <p className="mt-1 font-display text-5xl font-black text-black [transform:translateZ(40px)] sm:text-6xl">
            🪙 <AnimatedNumber value={points} />
          </p>
          <p className="mt-2 text-black/70">
            {player.name} · {game.idLabel} {player.uid}
          </p>
        </TiltCard>
      </div>

      <div className="mb-8 flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`relative rounded-xl px-5 py-2 font-display text-xs font-bold uppercase tracking-widest ${tab === t.id ? 'text-black' : 'text-white/60 hover:text-white'}`}>
            {tab === t.id && <motion.span layoutId="wallet-tab" className="absolute inset-0 rounded-xl" style={{ background: gradientOf(game) }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {tab === 'topup' && <TopUp game={game} />}
          {tab === 'history' && <History game={game} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
