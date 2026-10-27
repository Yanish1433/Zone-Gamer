import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import Field from '../components/ui/Field'
import GlowButton from '../components/ui/GlowButton'
import Modal from '../components/ui/Modal'
import TiltCard from '../components/ui/TiltCard'
import { useApp } from '../context/AppContext'
import { gradientOf } from '../data/games'
import { useGame } from '../hooks/useGame'
import GameHeader from '../sections/game/GameHeader'

const TEAM_SIZE = 4

export default function Tournament() {
  const { game, player } = useGame()
  const { points, registrations, registerTeam, toast } = useApp()
  const [tournaments, setTournaments] = useState(null) // null = loading
  const [active, setActive] = useState(null)
  const [team, setTeam] = useState('')
  const [members, setMembers] = useState(['', '', ''])
  const [errors, setErrors] = useState({})

  const load = useCallback(
    () =>
      api(`/tournaments?gameId=${game.id}`)
        .then(setTournaments)
        .catch((e) => {
          setTournaments([])
          toast(e.message, 'error')
        }),
    [game.id, toast],
  )
  useEffect(() => {
    load()
  }, [load])

  const mine = (t) => registrations.find((r) => r.gameId === game.id && r.tournamentId === t.id)

  const open = (t) => {
    setActive(t)
    setTeam('')
    setMembers(['', '', ''])
    setErrors({})
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (team.trim().length < 3) next.team = 'Team name must be at least 3 characters'
    const ids = members.map((m) => m.trim())
    ids.forEach((id, i) => {
      if (!game.idPattern.test(id)) next[`m${i}`] = `Enter a valid ${game.idLabel}`
    })
    const all = [player.uid, ...ids].map((x) => x.toLowerCase())
    if (new Set(all).size !== all.length) next.dup = 'Each teammate needs a different ID'
    if (points < active.entry) next.points = `You need ${active.entry} points. Top up in the wallet.`
    setErrors(next)
    if (Object.keys(next).length) return

    const error = await registerTeam(active.id, { name: team.trim(), players: [player.uid, ...ids] })
    if (error) {
      setErrors({ points: error })
      return load() // the tournament may have just filled up
    }
    toast(`${team.trim()} registered for ${active.name}`, 'success')
    setActive(null)
    load()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <GameHeader game={game} title="Full-Map Tournaments" subtitle={`Squads of ${TEAM_SIZE}. Pay the entry fee in points, drop in, and fight for the prize pool.`} />

      {tournaments?.length === 0 && <p className="text-xl text-white/50">No tournaments scheduled yet.</p>}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {(tournaments ?? []).map((t, i) => {
          const reg = mine(t)
          const filled = t.filled
          const full = filled >= t.slots
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 50, rotateX: -20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: i * 0.12, type: 'spring', stiffness: 100, damping: 16 }} style={{ perspective: 1000 }}>
              <TiltCard glow={game.colors.glow} className="glass flex h-full flex-col rounded-3xl p-6">
                <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl" style={{ background: gradientOf(game, 90) }} />
                <p className="font-display text-xs font-bold uppercase tracking-[0.3em] [transform:translateZ(30px)]" style={{ color: game.colors.from }}>
                  {t.map}
                </p>
                <h2 className="mt-1 font-display text-2xl font-black uppercase [transform:translateZ(40px)]">{t.name}</h2>
                <p className="mt-1 text-white/60">
                  {t.mode} · {t.start}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-black/40 p-3">
                    <p className="text-xs uppercase text-white/40">Prize pool</p>
                    <p className="font-display text-lg font-bold">🏆 {t.prize.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-black/40 p-3">
                    <p className="text-xs uppercase text-white/40">Entry</p>
                    <p className="font-display text-lg font-bold">🪙 {t.entry}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-sm text-white/60">
                    <span>Squads</span>
                    <span>
                      {filled}/{t.slots}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: gradientOf(game, 90) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(filled / t.slots) * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                    />
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  {reg ? (
                    <>
                      <p className="font-display text-sm font-bold uppercase text-emerald-400">✓ Registered · {reg.team.name}</p>
                      {t.roomInfo && <p className="mt-1 text-sm text-white/60">Room: {t.roomInfo}</p>}
                    </>
                  ) : (
                    <GlowButton colors={game.colors} disabled={full} onClick={() => open(t)}>
                      {full ? 'Full' : 'Register squad'}
                    </GlowButton>
                  )}
                </div>
              </TiltCard>
            </motion.div>
          )
        })}
      </div>

      <Modal open={Boolean(active)} onClose={() => setActive(null)} title={active ? `Register · ${active.name}` : ''}>
        {active && (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Team name" placeholder="e.g. Night Wolves" value={team} onChange={(e) => setTeam(e.target.value)} error={errors.team} />
            <Field label={`Captain · ${player.name}`} value={player.uid} readOnly disabled />
            {members.map((m, i) => (
              <Field
                key={i}
                label={`Player ${i + 2} · ${game.idLabel}`}
                placeholder={game.idPlaceholder}
                value={m}
                onChange={(e) => setMembers((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                error={errors[`m${i}`]}
              />
            ))}
            {errors.dup && <p className="text-sm text-red-400">{errors.dup}</p>}
            {errors.points && <p className="text-sm text-red-400">{errors.points}</p>}
            <p className="text-white/60">
              Entry fee: <b className="text-white">🪙 {active.entry}</b> · Your balance: 🪙 {points}
            </p>
            <GlowButton type="submit" colors={game.colors} className="w-full">
              Pay & register
            </GlowButton>
          </form>
        )}
      </Modal>
    </div>
  )
}
