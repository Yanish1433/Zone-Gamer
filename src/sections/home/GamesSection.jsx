import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import GameLogo from '../../components/ui/GameLogo'
import TiltCard from '../../components/ui/TiltCard'
import { useApp } from '../../context/AppContext'
import { GAMES, gradientOf } from '../../data/games'

export default function GamesSection() {
  const { players } = useApp()

  return (
    <section id="games" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-cyan-400">Pick your game</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-5xl">Three zones. One community.</h2>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3">
        {GAMES.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 60, rotateX: -25 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: i * 0.12, type: 'spring', stiffness: 100, damping: 16 }}
            style={{ perspective: 1000 }}
          >
            <Link to={players[g.id] ? `/game/${g.id}` : `/game/${g.id}/signup`} className="block">
              <TiltCard glow={g.colors.glow} className="glass overflow-hidden rounded-3xl p-6">
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: gradientOf(g, 90) }} />
                <div
                  className="size-24 overflow-hidden rounded-2xl shadow-xl [transform:translateZ(50px)]"
                  style={{ background: gradientOf(g), boxShadow: `0 20px 40px rgba(${g.colors.glow},0.35)` }}
                >
                  <GameLogo game={g} />
                </div>
                <h3 className="mt-6 font-display text-2xl font-black uppercase [transform:translateZ(30px)]">{g.name}</h3>
                <p className="mt-1 text-lg text-white/70">{g.tagline}</p>
                <p className="mt-3 text-white/50">{g.blurb}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
                  {['1v1 Bets', 'Top-up & Redeem', ...(g.hasTournament ? ['Tournaments'] : [])].map((c) => (
                    <span key={c} className="rounded-full border border-white/15 px-3 py-1 text-white/70">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="mt-6 font-display text-xs font-bold uppercase tracking-widest [transform:translateZ(30px)]" style={{ color: g.colors.from }}>
                  {players[g.id] ? 'Enter zone →' : 'Sign up with your ID →'}
                </p>
              </TiltCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
