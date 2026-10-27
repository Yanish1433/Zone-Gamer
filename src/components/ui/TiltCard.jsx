import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'

// Card that tilts toward the cursor in 3D and shows a soft light that follows it.
// Children can pop out of the card with e.g. className="[transform:translateZ(40px)]".
export default function TiltCard({ children, className = '', max = 12, glow = '255,255,255', ...rest }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const spring = { stiffness: 220, damping: 20 }
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), spring)
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), spring)
  const lightX = useTransform(x, [-0.5, 0.5], [0, 100])
  const lightY = useTransform(y, [-0.5, 0.5], [0, 100])
  const light = useMotionTemplate`radial-gradient(420px circle at ${lightX}% ${lightY}%, rgba(${glow},0.2), transparent 60%)`

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className={`relative ${className}`}
      {...rest}
    >
      <motion.div
        aria-hidden
        style={{ background: light }}
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
      />
      {children}
    </motion.div>
  )
}
