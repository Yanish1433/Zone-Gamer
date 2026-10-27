import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass max-h-[90vh] max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#0f0f1a]/90 p-6 shadow-2xl"
            style={{ transformPerspective: 1000 }}
            initial={{ opacity: 0, scale: 0.85, rotateX: 25, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold tracking-wide">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-xl text-white/60 hover:bg-white/10 hover:text-white">
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
