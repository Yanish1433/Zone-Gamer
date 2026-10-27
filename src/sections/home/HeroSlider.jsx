import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import Badge3D from '../../components/ui/Badge3D'
import GlowButton from '../../components/ui/GlowButton'
import { useApp } from '../../context/AppContext'
import { GAMES, gradientOf } from '../../data/games'

// Letters flip in one by one around the X axis for a 3D headline effect.
function FlipTitle({ text, gradient }) {
  return (
    <h1
      className="flex flex-wrap font-display text-5xl font-black uppercase leading-none sm:text-7xl lg:text-8xl [perspective:800px]"
      aria-label={text}
    >
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ opacity: 0, y: 50, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, y: -30, rotateX: 90, transition: { duration: 0.2, delay: i * 0.01 } }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: i * 0.04 }}
          className="inline-block bg-clip-text text-transparent"
          style={{ backgroundImage: gradient }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </h1>
  )
}

export default function HeroSlider() {
  const { players } = useApp()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const game = GAMES[index]
  const joined = Boolean(players[game.id])

  const go = (i) => setIndex((i + GAMES.length) % GAMES.length)

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence>
        <motion.div
          key={game.id}
          aria-hidden
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 70% 40%, rgba(${game.colors.glow},0.22), transparent 60%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>

      <div className="relative mx-auto grid lg:min-h-[calc(100dvh-64px)] max-w-7xl items-center gap-6 px-4 pb-28 pt-10 sm:px-6 lg:grid-cols-2">
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={game.id} initial="in" animate="in" exit="out">
              <motion.p
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="mb-3 font-display text-xs font-bold uppercase tracking-[0.4em] sm:text-sm"
                style={{ color: game.colors.from }}
              >
                Choose your battlefield
              </motion.p>
              <FlipTitle text={game.short} gradient={gradientOf(game)} />
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-2xl font-semibold text-white/90 sm:text-3xl"
              >
                {game.tagline}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-2 max-w-md text-white/60"
              >
                {game.blurb} 1v1 stakes, top-ups{game.hasTournament ? ' and full-map tournaments' : ''}.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex flex-wrap gap-4"
              >
                <GlowButton colors={game.colors} to={joined ? `/game/${game.id}` : `/game/${game.id}/signup`}>
                  {joined ? `Enter ${game.short} Zone` : `Join ${game.short}`}
                </GlowButton>
                <GlowButton colors={game.colors} variant="outline" onClick={() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })}>
                  All games
                </GlowButton>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative min-h-[300px] sm:min-h-[360px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={game.id}
              initial={{ opacity: 0, scale: 0.5, rotateY: -100 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotateY: 100 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              style={{ transformPerspective: 1200 }}
            >
              <Badge3D game={game} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide selector: three game tabs, each with an auto-advance progress bar */}
      <div className="absolute inset-x-0 bottom-6 mx-auto flex max-w-xl items-center gap-2 px-4">
        <button onClick={() => go(index - 1)} aria-label="Previous game" className="glass hidden size-10 shrink-0 rounded-full sm:block hover:bg-white/10">
          ‹
        </button>
        <div className="grid flex-1 grid-cols-3 gap-2">
          {GAMES.map((g, i) => (
            <button
              key={g.id}
              onClick={() => go(i)}
              aria-label={`Show ${g.name}`}
              aria-current={i === index}
              className={`glass relative overflow-hidden rounded-xl px-2 py-3 text-center font-display text-[11px] font-bold uppercase tracking-wider transition sm:text-xs ${
                i === index ? 'text-white' : 'text-white/45 hover:text-white/80'
              }`}
            >
              <img src={g.logo} alt="" className="mr-1.5 inline-block size-5 rounded-md object-cover align-middle" />
              {g.short}
              {i === index && (
                <span
                  key={index}
                  onAnimationEnd={() => go(index + 1)}
                  className="absolute inset-x-0 bottom-0 h-1"
                  style={{
                    background: gradientOf(g, 90),
                    animation: 'slide-progress 6s linear forwards',
                    animationPlayState: paused ? 'paused' : 'running',
                  }}
                />
              )}
            </button>
          ))}
        </div>
        <button onClick={() => go(index + 1)} aria-label="Next game" className="glass hidden size-10 shrink-0 rounded-full sm:block hover:bg-white/10">
          ›
        </button>
      </div>
    </section>
  )
}
