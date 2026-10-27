import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Field from '../components/ui/Field'
import GlowButton from '../components/ui/GlowButton'
import TiltCard from '../components/ui/TiltCard'
import { useApp } from '../context/AppContext'
import { DEFAULT_COLORS, GAMES } from '../data/games'

const FACES = [
  { emoji: GAMES[0].emoji, t: 'rotateY(0deg)' },
  { emoji: GAMES[1].emoji, t: 'rotateY(90deg)' },
  { emoji: GAMES[2].emoji, t: 'rotateY(180deg)' },
  { emoji: '🪙', t: 'rotateY(-90deg)' },
  { emoji: '🏆', t: 'rotateX(90deg)' },
  { emoji: '🎮', t: 'rotateX(-90deg)' },
]
const SIZE = 180

// Spinning cube that also leans toward the cursor, with coins orbiting it.
function Scene() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const spring = { stiffness: 60, damping: 18 }
  const lean = useSpring(useTransform(mx, [-0.5, 0.5], [-25, 25]), spring)
  const tilt = useSpring(useTransform(my, [-0.5, 0.5], [20, -20]), spring)

  useEffect(() => {
    const move = (e) => {
      mx.set(e.clientX / window.innerWidth - 0.5)
      my.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [mx, my])

  return (
    <div className="relative mx-auto flex h-[380px] w-full max-w-md items-center justify-center" style={{ perspective: 1000 }}>
      <motion.div style={{ rotateY: lean, rotateX: tilt, transformStyle: 'preserve-3d' }} className="relative">
        <motion.div
          animate={{ rotateY: 360, rotateX: [-15, 15, -15] }}
          transition={{ rotateY: { duration: 16, repeat: Infinity, ease: 'linear' }, rotateX: { duration: 8, repeat: Infinity, ease: 'easeInOut' } }}
          style={{ width: SIZE, height: SIZE, transformStyle: 'preserve-3d' }}
          className="relative"
        >
          {FACES.map((f) => (
            <div
              key={f.t}
              className="glass absolute inset-0 flex items-center justify-center rounded-2xl text-7xl"
              style={{ transform: `${f.t} translateZ(${SIZE / 2}px)`, boxShadow: `inset 0 0 40px rgba(${DEFAULT_COLORS.glow},0.35)` }}
            >
              {f.emoji}
            </div>
          ))}
        </motion.div>

        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -ml-4 -mt-4 text-3xl"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: [i * 60, i * 60 + 360], y: [0, i % 2 ? -30 : 30, 0] }}
            transition={{ rotateY: { duration: 9, repeat: Infinity, ease: 'linear' }, y: { duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' } }}
          >
            <span className="block" style={{ transform: 'translateZ(190px)' }}>
              🪙
            </span>
          </motion.div>
        ))}
      </motion.div>
      <div aria-hidden className="absolute bottom-6 h-6 w-48 rounded-full bg-fuchsia-500/30 blur-xl" />
    </div>
  )
}

function Burst() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2
        return (
          <motion.span
            key={i}
            className="absolute size-3 rounded-full"
            style={{ background: i % 2 ? DEFAULT_COLORS.from : DEFAULT_COLORS.to }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * 170, y: Math.sin(a) * 170, opacity: 0, scale: 0.2 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register } = useApp()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const isNew = mode === 'register'

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => navigate(location.state?.from || '/', { replace: true }), 1400)
    return () => clearTimeout(t)
  }, [done, navigate, location.state])

  const switchMode = () => {
    setMode(isNew ? 'login' : 'register')
    setErrors({})
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (isNew && name.trim().length < 3) next.name = 'Name must be at least 3 characters'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address'
    if (password.length < 6) next.password = 'Password must be at least 6 characters'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    const error = await (isNew ? register({ name, email, password }) : login({ email, password }))
    setBusy(false)
    if (error) setErrors({ form: error })
    else setDone(true)
  }

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <Scene />

      <div style={{ perspective: 1000 }}>
        <TiltCard glow={DEFAULT_COLORS.glow} max={6} className="glass relative rounded-3xl p-8">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.7, rotateX: 50 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} className="relative py-10 text-center">
                <Burst />
                <div className="text-6xl">🎮</div>
                <h1 className="mt-4 font-display text-2xl font-black uppercase">{isNew ? 'Account created' : 'Welcome back'}</h1>
                <p className="mt-2 text-lg text-white/70">Loading your zone…</p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} noValidate initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60 }} className="space-y-5">
                <div className="[transform:translateZ(40px)]">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.4em]" style={{ color: DEFAULT_COLORS.from }}>
                    {isNew ? 'New player' : 'Player login'}
                  </p>
                  <h1 className="mt-1 font-display text-3xl font-black uppercase">{isNew ? 'Create account' : 'Enter the zone'}</h1>
                  <p className="mt-1 text-white/60">{isNew ? 'Sign up once, then join any game. You start with 0 points.' : 'Log in to keep your points, matches and rewards.'}</p>
                </div>
                {isNew && <Field label="Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />}
                <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" />
                <div className="relative">
                  <Field label="Password" type={show ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete={isNew ? 'new-password' : 'current-password'} />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[38px] text-sm uppercase text-white/50 hover:text-white">
                    {show ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}
                <GlowButton type="submit" className="w-full" disabled={busy}>
                  {isNew ? 'Create account' : 'Log in'}
                </GlowButton>
                <p className="text-center text-sm text-white/40">
                  {isNew ? 'Already have an account?' : 'New here?'}{' '}
                  <button type="button" onClick={switchMode} className="underline hover:text-white">
                    {isNew ? 'Log in' : 'Create an account'}
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </TiltCard>
      </div>
    </div>
  )
}
