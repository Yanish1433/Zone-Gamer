import { motion } from 'framer-motion'
import { useState } from 'react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import Field from '../components/ui/Field'
import GlowButton from '../components/ui/GlowButton'
import Modal from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { DEFAULT_COLORS, GAMES, MIN_REDEEM, PAYMENT_METHODS, POINTS_PER_RS } from '../data/games'

// Site-wide redeem: points won in every game add up in one balance, redeemed in one request.
export default function Redeem() {
  const { winnings, players, redeem } = useApp()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [account, setAccount] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(null) // redeemed amount once submitted

  const joined = GAMES.filter((g) => players[g.id])

  const submit = async (e) => {
    e.preventDefault()
    const value = Number(amount)
    if (!Number.isInteger(value) || value < MIN_REDEEM) return setError(`Minimum redeem is ${MIN_REDEEM} points`)
    if (value > winnings) return setError('You can only redeem points you have won')
    if (account.trim().length < 5) return setError('Enter your account / number for the payout')
    setError('')
    const err = await redeem(value, method, account.trim())
    if (err) return setError(err)
    setDone(value)
  }

  const close = () => {
    setDone(null)
    setAmount('')
    setAccount('')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <motion.h1 initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} className="font-display text-4xl font-black uppercase sm:text-6xl">
        <span className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">Redeem</span>
      </motion.h1>
      <p className="mt-2 text-xl text-white/60">Only points you win in games can be redeemed. Wins from every game add up here. Bought points are for playing.</p>

      <div className="glass mt-8 rounded-3xl p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-white/60">Redeemable winnings</p>
        <p className="font-display text-5xl font-black">
          🪙 <AnimatedNumber value={winnings} />
        </p>
        <p className="text-white/40">= Rs {(winnings / POINTS_PER_RS).toLocaleString()}</p>

        {joined.length === 0 ? (
          <div className="mt-6 space-y-3">
            <p className="text-lg text-white/70">Sign up to a game and win points to redeem.</p>
            <div className="flex flex-wrap gap-3">
              {GAMES.map((g) => (
                <GlowButton key={g.id} colors={g.colors} variant="outline" to={`/game/${g.id}/signup`}>
                  {g.short}
                </GlowButton>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            <Field
              label="Points to redeem"
              placeholder={`Min ${MIN_REDEEM}`}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              hint={amount ? `You get Rs ${(Number(amount) / POINTS_PER_RS).toLocaleString()}` : undefined}
            />
            <button type="button" onClick={() => setAmount(String(winnings))} className="text-sm underline text-white/60 hover:text-white">
              Redeem all
            </button>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold uppercase tracking-wider text-white/60">Payout method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg text-white outline-none">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <Field label="Account / number" placeholder="Where to send the money" value={account} onChange={(e) => setAccount(e.target.value)} />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <GlowButton type="submit" colors={DEFAULT_COLORS} className="w-full" disabled={winnings < MIN_REDEEM}>
              {winnings < MIN_REDEEM ? `Win ${MIN_REDEEM} points to redeem` : 'Redeem'}
            </GlowButton>
          </form>
        )}
      </div>

      <Modal open={done !== null} onClose={close} title="Redeemed!">
        <div className="space-y-4 text-center">
          <div className="text-6xl">🎉</div>
          <p className="text-lg text-white/70">
            Rs {((done ?? 0) / POINTS_PER_RS).toLocaleString()} will be sent to <b className="text-white">{account}</b> via {method} from our payment account, after a quick check by our team.
          </p>
          <GlowButton colors={DEFAULT_COLORS} onClick={close}>
            Done
          </GlowButton>
        </div>
      </Modal>
    </div>
  )
}
