import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

// Counts smoothly from the previous value to the new one.
export default function AnimatedNumber({ value, className = '' }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: 'easeOut' })
    return controls.stop
  }, [value, mv])

  return <motion.span className={className}>{text}</motion.span>
}
