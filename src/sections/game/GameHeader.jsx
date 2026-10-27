import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { gradientOf } from '../../data/games'

// Title block shared by every game sub-page.
export default function GameHeader({ game, title, subtitle, back = true }) {
  return (
    <div className="mb-10">
      {back && (
        <Link to={`/game/${game.id}`} className="mb-4 inline-block text-white/50 hover:text-white">
          ← {game.short} Zone
        </Link>
      )}
      <motion.h1
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        className="font-display text-4xl font-black uppercase sm:text-6xl"
      >
        <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradientOf(game) }}>
          {title}
        </span>
      </motion.h1>
      {subtitle && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 max-w-2xl text-xl text-white/60">
          {subtitle}
        </motion.p>
      )}
    </div>
  )
}
