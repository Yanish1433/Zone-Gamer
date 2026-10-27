import { motion } from 'framer-motion'

// Fixed backdrop: glowing orbs plus a perspective grid floor that scrolls toward the viewer.
// `glow` is an "r,g,b" string so each game can tint the whole site.
export default function AnimatedBackground({ glow }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <motion.div
        className="absolute -left-40 -top-40 size-[34rem] rounded-full blur-[120px]"
        animate={{ background: `rgba(${glow},0.28)`, x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ background: { duration: 1 }, x: { duration: 14, repeat: Infinity }, y: { duration: 14, repeat: Infinity } }}
      />
      <motion.div
        className="absolute -bottom-40 -right-32 size-[30rem] rounded-full blur-[120px]"
        animate={{ background: `rgba(${glow},0.18)`, x: [0, -50, 0], y: [0, -50, 0] }}
        transition={{ background: { duration: 1 }, x: { duration: 18, repeat: Infinity }, y: { duration: 18, repeat: Infinity } }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[55%] [perspective:500px] [mask-image:linear-gradient(to_top,black,transparent)]">
        <div className="grid-floor h-[200%] w-full origin-bottom [transform:rotateX(62deg)]" />
      </div>
    </div>
  )
}
