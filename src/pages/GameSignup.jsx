import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Badge3D from '../components/ui/Badge3D'
import Field from '../components/ui/Field'
import GameLogo from '../components/ui/GameLogo'
import GlowButton from '../components/ui/GlowButton'
import { useApp } from '../context/AppContext'
import { useGame } from '../hooks/useGame'

// Particles that burst outward when signup succeeds.
function Burst({ color }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2
        return (
          <motion.span
            key={i}
            className="absolute size-3 rounded-full"
            style={{ background: color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 160, y: Math.sin(angle) * 160, opacity: 0, scale: 0.2 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

export default function GameSignup() {
  const { game, player } = useGame()
  const { signUp, toast } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [uid, setUid] = useState('')
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => navigate(`/game/${game.id}`), 1800)
    return () => clearTimeout(t)
  }, [done, navigate, game.id])

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (name.trim().length < 3) next.name = 'Gamer name must be at least 3 characters'
    if (!game.idPattern.test(uid.trim())) next.uid = `Enter a valid ${game.idLabel}`
    if (!agree) next.agree = 'Please accept the fair-play rules'
    setErrors(next)
    if (Object.keys(next).length) return
    const error = await signUp(game.id, { name: name.trim(), uid: uid.trim() })
    if (error) return setErrors({ uid: error })
    toast(`Welcome to ${game.short}!`, 'success')
    setDone(true)
  }

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <Badge3D game={game} className="order-2 lg:order-1" />

      <div className="relative order-1 lg:order-2">
        <AnimatePresence mode="wait">
          {player && !done ? (
            <motion.div key="already" initial={{ opacity: 0, rotateY: -30 }} animate={{ opacity: 1, rotateY: 0 }} className="glass rounded-3xl p-8">
              <h1 className="font-display text-2xl font-black uppercase">You're in!</h1>
              <p className="mt-3 text-lg text-white/70">
                Registered as <b className="text-white">{player.name}</b> · {game.idLabel} <b className="text-white">{player.uid}</b>
              </p>
              <div className="mt-6">
                <GlowButton colors={game.colors} to={`/game/${game.id}`}>
                  Enter {game.short} Zone
                </GlowButton>
              </div>
            </motion.div>
          ) : done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="glass relative rounded-3xl p-10 text-center">
              <Burst color={game.colors.from} />
              <div className="mx-auto size-24 overflow-hidden rounded-2xl shadow-xl"><GameLogo game={game} /></div>
              <h1 className="mt-4 font-display text-2xl font-black uppercase">Account created</h1>
              <p className="mt-2 text-lg text-white/70">Loading your zone…</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={submit}
              noValidate
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              className="glass space-y-5 rounded-3xl p-8"
            >
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.4em]" style={{ color: game.colors.from }}>
                  {game.short} signup
                </p>
                <h1 className="mt-1 font-display text-3xl font-black uppercase">Join the zone</h1>
                <p className="mt-1 text-white/60">Sign up with your {game.idLabel} to start winning points.</p>
              </div>
              <Field label="Gamer name" placeholder="Your in-game name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <Field label={game.idLabel} placeholder={game.idPlaceholder} hint={game.idHint} value={uid} onChange={(e) => setUid(e.target.value)} error={errors.uid} inputMode={game.id === 'efootball' ? 'text' : 'numeric'} />
              <div>
                <label className="flex items-start gap-3 text-white/70">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1.5 size-4 accent-fuchsia-500" />
                  I agree to play fair, no hacks, no smurfing, and to use my own ID.
                </label>
                {errors.agree && <span className="mt-1 block text-sm text-red-400">{errors.agree}</span>}
              </div>
              <GlowButton type="submit" colors={game.colors} className="w-full">
                Create {game.short} account
              </GlowButton>
              <p className="text-center text-sm text-white/40">
                Wrong game? <Link to="/" className="underline hover:text-white">Go back</Link>
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
