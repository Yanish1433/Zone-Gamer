import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT, PROBLEM_TOPICS } from '../../data/contact'
import { GAMES } from '../../data/games'
import GlowButton from '../ui/GlowButton'

const CHANNELS = [
  { icon: '✉️', label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
  { icon: '💬', label: 'WhatsApp', value: CONTACT.phone, href: `https://wa.me/${CONTACT.whatsapp}` },
  { icon: '📞', label: 'Call us', value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, '')}` },
  { icon: '🕒', label: 'Support hours', value: CONTACT.hours },
]

export default function Footer() {
  const [topic, setTopic] = useState(PROBLEM_TOPICS[0])
  const [message, setMessage] = useState('')

  // No backend yet, so the report opens the user's mail app pre-filled.
  const report = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`[ZoneGamer] ${topic}`)
    const body = encodeURIComponent(message.trim())
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`
  }

  return (
    <footer id="contact" className="mt-24 scroll-mt-20 border-t border-white/10 bg-black/30">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-cyan-400">Contact us</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Facing a problem? We're here.</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/60">Payment stuck, wrong result, can't log in? Reach us any way below and we'll sort it out.</p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {CHANNELS.map((c, i) => {
              const Tag = c.href ? motion.a : motion.div
              return (
                <Tag
                  key={c.label}
                  href={c.href}
                  target={c.href?.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={c.href ? { y: -6, scale: 1.03 } : undefined}
                  className="glass flex items-center gap-4 rounded-2xl p-5"
                >
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                    className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-cyan-400/30 text-2xl"
                  >
                    {c.icon}
                  </motion.span>
                  <span className="min-w-0">
                    <span className="block text-sm uppercase tracking-widest text-white/50">{c.label}</span>
                    <span className="block truncate font-semibold">{c.value}</span>
                  </span>
                </Tag>
              )
            })}
          </div>

          <motion.form
            onSubmit={report}
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass space-y-4 rounded-2xl p-6"
          >
            <p className="font-display text-sm font-bold uppercase tracking-widest">Report a problem</p>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Problem type" className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white">
              {PROBLEM_TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what happened (include your game ID if relevant)"
              aria-label="Describe the problem"
              className="w-full resize-none rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
            />
            <GlowButton type="submit" className="w-full">
              Send report
            </GlowButton>
          </motion.form>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-white/50 md:flex-row md:items-center md:justify-between">
          <p className="font-display text-lg font-black tracking-widest text-white">ZONEGAMER</p>
          <div className="flex flex-wrap gap-4">
            {GAMES.map((g) => (
              <Link key={g.id} to={`/game/${g.id}`} className="hover:text-white">
                {g.short}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
