import { motion } from 'framer-motion'
import TiltCard from '../../components/ui/TiltCard'

const FEATURES = [
  { icon: '⚔️', title: '1v1 Arena', text: 'Challenge another gamer, lock equal stakes in game points, winner takes the pot.' },
  { icon: '💳', title: 'Top-up & Redeem', text: 'Buy points in seconds. Points you win across all games add up in one balance you can redeem.' },
  { icon: '🏆', title: 'Full-Map Tournaments', text: 'Register your squad for PUBG and Free Fire lobbies with big prize pools.' },
  { icon: '🆔', title: 'One ID per Game', text: 'Sign up with your PUBG, Free Fire or eFootball ID. No more, no less.' },
]

export default function FeaturesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            style={{ perspective: 900 }}
          >
            <TiltCard max={8} glow="168,85,247" className="glass h-full rounded-2xl p-6">
              <motion.div
                className="text-4xl [transform:translateZ(40px)]"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                {f.icon}
              </motion.div>
              <h3 className="mt-4 font-display text-lg font-bold uppercase [transform:translateZ(20px)]">{f.title}</h3>
              <p className="mt-2 text-white/60">{f.text}</p>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
