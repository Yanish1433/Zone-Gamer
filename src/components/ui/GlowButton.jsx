import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DEFAULT_COLORS } from '../../data/games'

// Pill button with a neon glow. Renders a router <Link> when `to` is given.
export default function GlowButton({
  to,
  onClick,
  children,
  colors = DEFAULT_COLORS,
  variant = 'solid',
  className = '',
  type = 'button',
  disabled = false,
}) {
  const solid = variant === 'solid'
  const style = solid
    ? {
        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        boxShadow: `0 0 28px rgba(${colors.glow},0.4)`,
        color: '#0b0b12',
      }
    : { border: `1px solid rgba(${colors.glow},0.6)`, color: `rgb(${colors.glow})` }

  const base = `inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-display text-xs font-bold uppercase tracking-widest sm:text-sm ${className}`

  return (
    <motion.div
      whileHover={disabled ? undefined : { scale: 1.05, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className={`inline-block ${disabled ? 'opacity-40' : ''}`}
    >
      {to ? (
        <Link to={to} style={style} className={base}>
          {children}
        </Link>
      ) : (
        <button type={type} onClick={onClick} disabled={disabled} style={style} className={`${base} disabled:cursor-not-allowed`}>
          {children}
        </button>
      )}
    </motion.div>
  )
}
