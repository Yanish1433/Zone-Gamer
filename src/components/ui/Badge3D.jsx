import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import GameLogo from './GameLogo'
import { gradientOf } from '../../data/games'

// Layered 3D emblem for a game: glow disc, spinning rings, floating emblem and orbiting chips.
// Layers sit at different Z depths, so moving the cursor produces real parallax.
export default function Badge3D({ game, className = '' }) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const spring = { stiffness: 120, damping: 18 }
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [20, -20]), spring)
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-24, 24]), spring)
  const { from, glow } = game.colors

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => {
    mx.set(0)
    my.set(0)
  }

  const chipPositions = [
    'left-[2%] top-[18%]',
    'right-[0%] top-[42%]',
    'bottom-[10%] left-[18%]',
  ]

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`flex items-center justify-center [perspective:1100px] ${className}`}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative size-60 min-[400px]:size-72 sm:size-96">
        <div
          className="absolute inset-6 rounded-full blur-3xl"
          style={{ background: `rgba(${glow},0.45)`, transform: 'translateZ(-140px)' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-dashed"
          style={{ borderColor: `rgba(${glow},0.55)`, z: -70 }}
          animate={{ rotateZ: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-8 rounded-full border-4"
          style={{ borderColor: `rgba(${glow},0.9)`, rotateX: 68, z: -10, boxShadow: `0 0 40px rgba(${glow},0.6)` }}
          animate={{ rotateZ: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-[18%] overflow-hidden rounded-[2rem] border border-white/20 shadow-2xl"
          style={{ background: gradientOf(game), z: 70, boxShadow: `0 30px 80px rgba(${glow},0.45)` }}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <GameLogo game={game} />
        </motion.div>
        {game.chips.map((chip, i) => (
          <motion.div
            key={chip}
            className={`glass absolute ${chipPositions[i]} flex size-14 items-center justify-center rounded-2xl font-display text-sm font-bold sm:size-16`}
            style={{ z: 120 + i * 20, color: from }}
            animate={{ y: [0, i % 2 ? 12 : -12, 0] }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          >
            {chip}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
