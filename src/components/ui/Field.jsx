import { motion } from 'framer-motion'

// Labelled text input with an inline error that shakes in.
export default function Field({ label, hint, error, className = '', ...input }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-semibold uppercase tracking-wider text-white/60">{label}</span>
      <input
        {...input}
        className={`w-full rounded-xl border bg-black/40 px-4 py-3 text-lg text-white outline-none transition placeholder:text-white/25 focus:border-white/50 focus:bg-black/60 ${
          error ? 'border-red-500/70' : 'border-white/10'
        }`}
      />
      {error ? (
        <motion.span
          key={error}
          initial={{ x: -8, opacity: 0 }}
          animate={{ x: [-8, 6, -4, 0], opacity: 1 }}
          className="mt-1 block text-sm text-red-400"
        >
          {error}
        </motion.span>
      ) : (
        hint && <span className="mt-1 block text-sm text-white/40">{hint}</span>
      )}
    </label>
  )
}
