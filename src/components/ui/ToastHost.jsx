import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'

const TONES = {
  info: 'border-cyan-400/40',
  success: 'border-emerald-400/50',
  error: 'border-red-400/50',
}

export default function ToastHost() {
  const { toasts } = useApp()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 80, rotateY: -40 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className={`glass rounded-xl border-l-4 bg-[#0f0f1a]/90 px-4 py-3 text-base font-semibold ${TONES[t.type]}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
