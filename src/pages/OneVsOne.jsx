import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { api, imageProblem, uploadImage } from '../api'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import Field from '../components/ui/Field'
import GameLogo from '../components/ui/GameLogo'
import GlowButton from '../components/ui/GlowButton'
import ScreenshotPicker from '../components/ui/ScreenshotPicker'
import { useApp } from '../context/AppContext'
import { PLATFORM_FEE, STAKE_PRESETS, gradientOf } from '../data/games'
import { useGame } from '../hooks/useGame'
import GameHeader from '../sections/game/GameHeader'

function PlayerCard({ name, sub, game, side }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -200 : 200, rotateY: side === 'left' ? 60 : -60 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 90, damping: 14 }}
      style={{ transformPerspective: 900 }}
      className="glass flex-1 rounded-3xl p-6 text-center"
    >
      <div className="mx-auto size-20 overflow-hidden rounded-2xl">
        <GameLogo game={game} />
      </div>
      <p className="mt-3 font-display text-lg font-bold">{name}</p>
      <p className="text-white/50">{sub}</p>
    </motion.div>
  )
}

const POLL_MS = 3000

const label = (c) => `${c.teamSize}v${c.teamSize} · ${c.mode}`

export default function OneVsOne() {
  const { game, player } = useGame()
  const { points, refresh, toast } = useApp()

  const [stage, setStage] = useState('lobby') // lobby | versus | playing | waiting | disputed | result
  const [mine, setMine] = useState(null) // the challenge this user posted, waiting for an opponent
  const [match, setMatch] = useState(null)
  const [result, setResult] = useState(null)
  const [count, setCount] = useState(3)
  const [stake, setStake] = useState(100)
  const [mode, setMode] = useState(game.modes[0])
  const [teamSize, setTeamSize] = useState(1)
  const [matchTime, setMatchTime] = useState(game.matchTimes?.[1] ?? null)
  const [roomCode, setRoomCode] = useState('')
  const [roomPass, setRoomPass] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [stakeError, setStakeError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shot, setShot] = useState(null) // result screenshot for the report
  const [lobby, setLobby] = useState([]) // open challenges: { id, name, rank, winRate, stake, mode }

  const toMatch = useCallback((c) => ({ id: c.id, opp: c.opp, stake: c.stake, mode: label(c), room: c.room, pass: c.pass }), [])

  const begin = useCallback(
    (c) => {
      setMine(null)
      setMatch(toMatch(c))
      setCount(3)
      setStage('versus')
      refresh()
    },
    [toMatch, refresh],
  )

  const finish = useCallback(
    (c) => {
      if (c.status === 'completed') {
        setResult({ won: c.won, payout: c.payout })
        setStage('result')
      } else if (c.status === 'disputed') setStage('disputed')
      else if (c.status === 'cancelled') {
        setResult({ won: false, refunded: true })
        setStage('result')
      }
      refresh()
    },
    [refresh],
  )

  // Restore an unfinished challenge or match after a reload.
  useEffect(() => {
    api(`/challenges/active?gameId=${game.id}`)
      .then((c) => {
        if (!c) return
        if (c.status === 'open') return setMine({ ...c, mode: label(c) })
        setMatch(toMatch(c))
        if (c.status === 'disputed') setStage('disputed')
        else setStage(c.myReport ? 'waiting' : 'playing')
      })
      .catch(() => {})
  }, [game.id, toMatch])

  // Open challenges from other players.
  useEffect(() => {
    if (stage !== 'lobby') return
    let alive = true
    const load = () => api(`/challenges?gameId=${game.id}`).then((l) => alive && setLobby(l)).catch(() => {})
    load()
    const t = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [stage, game.id])

  // Waiting for a rival to accept my challenge, or for the rival to report their result.
  const watchId = stage === 'lobby' ? mine?.id : stage === 'waiting' ? match?.id : null
  useEffect(() => {
    if (!watchId) return
    const t = setInterval(() => {
      api(`/challenges/${watchId}`)
        .then((c) => {
          if (stage === 'lobby' && c.status === 'matched') begin(c)
          else if (stage === 'lobby' && c.status === 'cancelled') setMine(null)
          else if (stage === 'waiting') finish(c)
        })
        .catch(() => {})
    }, POLL_MS)
    return () => clearInterval(t)
  }, [watchId, stage, begin, finish])

  const accept = async (c) => {
    if (points < c.stake) return toast('Not enough points. Top up in the wallet.', 'error')
    setBusy(true)
    try {
      begin(await api(`/challenges/${c.id}/accept`, { method: 'POST' }))
    } catch (e) {
      toast(e.message, 'error')
      setLobby((l) => l.filter((x) => x.id !== c.id))
    }
    setBusy(false)
  }

  const post = async () => {
    const amount = Number(stake)
    if (!Number.isInteger(amount) || amount < 10) return setStakeError('Minimum stake is 10 points')
    if (amount > points) return setStakeError('You do not have enough points')
    setStakeError('')
    const errs = {}
    const baseMode = game.customMode ? mode.trim() : game.modes[0]
    if (!baseMode) errs.mode = 'Enter a mode'
    if (!roomCode.trim()) errs.room = 'Enter the room code'
    if (Object.keys(errs).length) return setFormErrors(errs)
    setFormErrors({})
    setBusy(true)
    try {
      const c = await api('/challenges', {
        method: 'POST',
        body: { gameId: game.id, stake: amount, teamSize, mode: baseMode, matchTime, room: roomCode.trim(), pass: game.hasPassword ? roomPass.trim() : '' },
      })
      setMine({ ...c, mode: label(c) })
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
    setBusy(false)
  }

  const cancelMine = async () => {
    setBusy(true)
    try {
      await api(`/challenges/${mine.id}`, { method: 'DELETE' })
      setMine(null)
    } catch (e) {
      toast(e.message, 'error') // probably accepted a moment ago; the poll will pick it up
    }
    refresh()
    setBusy(false)
  }

  // 3-2-1 countdown on the VS screen
  useEffect(() => {
    if (stage !== 'versus') return
    // 3, 2, 1, then "VS" for one beat before the room details appear
    const t = setTimeout(() => (count === 0 ? setStage('playing') : setCount((c) => c - 1)), 900)
    return () => clearTimeout(t)
  }, [stage, count])

  // Both players report. Matching reports pay the winner; conflicting ones go to an admin.
  const report = async (won) => {
    const problem = imageProblem(shot)
    if (problem) return toast(`Add your result screenshot first. ${problem}`, 'error')
    setBusy(true)
    try {
      const screenshotId = await uploadImage(shot, 'match')
      const c = await api(`/challenges/${match.id}/report`, { method: 'POST', body: { won, screenshotId } })
      setShot(null)
      if (c.status === 'matched') setStage('waiting')
      else finish(c)
    } catch (e) {
      toast(e.message, 'error')
    }
    setBusy(false)
  }

  const reset = () => {
    setMatch(null)
    setResult(null)
    setStage('lobby')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <GameHeader game={game} title="1v1 Arena" subtitle={`Stake game points, face a rival in ${game.short}, winner takes the pot (minus ${PLATFORM_FEE * 100}% fee).`} />

      <AnimatePresence mode="wait">
        {stage === 'lobby' && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="grid gap-8 lg:grid-cols-[360px_1fr]">
            <div className="glass h-fit space-y-5 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold uppercase">Create challenge</h2>
                <span className="font-display text-sm">
                  🪙 <AnimatedNumber value={points} />
                </span>
              </div>

              {mine ? (
                <div className="space-y-4">
                  <div className="shimmer rounded-2xl p-5 text-center">
                    <p className="font-display text-sm uppercase tracking-widest">Waiting for a rival…</p>
                    <p className="mt-1 text-2xl font-bold">🪙 {mine.stake}</p>
                    <p className="text-white/60">{mine.mode}</p>
                    <p className="mt-1 text-sm text-white/40">
                      Room {mine.room}
                      {mine.pass ? ` · Pass ${mine.pass}` : ''}
                    </p>
                  </div>
                  <GlowButton variant="outline" onClick={cancelMine} disabled={busy} className="w-full">
                    Cancel & refund
                  </GlowButton>
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">Team size</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: game.maxTeam }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => setTeamSize(n)}
                          className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${n === teamSize ? 'border-transparent text-black' : 'border-white/15 text-white/70 hover:border-white/40'}`}
                          style={n === teamSize ? { background: gradientOf(game) } : undefined}
                        >
                          {n}v{n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {game.customMode ? (
                    <div>
                      <Field label="Mode" value={mode} onChange={(e) => setMode(e.target.value)} placeholder="Type a mode, e.g. TDM · Warehouse" error={formErrors.mode} />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {game.modes.map((m) => (
                          <button key={m} onClick={() => setMode(m)} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 hover:border-white/40">
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">Mode</p>
                      <span className="inline-block rounded-full border border-transparent px-3 py-1 text-sm font-semibold text-black" style={{ background: gradientOf(game) }}>
                        {game.modes[0]}
                      </span>
                    </div>
                  )}
                  {game.matchTimes && (
                    <div>
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">Match time</p>
                      <div className="flex flex-wrap gap-2">
                        {game.matchTimes.map((t) => (
                          <button
                            key={t}
                            onClick={() => setMatchTime(t)}
                            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${t === matchTime ? 'border-transparent text-black' : 'border-white/15 text-white/70 hover:border-white/40'}`}
                            style={t === matchTime ? { background: gradientOf(game) } : undefined}
                          >
                            {t} min
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Field label={game.hasPassword ? 'Room ID' : 'Room code'} value={roomCode} onChange={(e) => setRoomCode(e.target.value)} error={formErrors.room} />
                  {game.hasPassword && <Field label="Password (optional)" value={roomPass} onChange={(e) => setRoomPass(e.target.value)} />}
                  <div>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">Quick stake</p>
                    <div className="grid grid-cols-4 gap-2">
                      {STAKE_PRESETS.map((s) => (
                        <button key={s} onClick={() => setStake(s)} className={`rounded-lg border py-2 font-display text-sm font-bold ${Number(stake) === s ? 'border-white/60 bg-white/10' : 'border-white/10 text-white/60 hover:border-white/30'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="Stake (points)" type="number" min="10" value={stake} onChange={(e) => setStake(e.target.value)} error={stakeError} />
                  <GlowButton colors={game.colors} onClick={post} disabled={busy} className="w-full">
                    Post challenge
                  </GlowButton>
                </>
              )}
            </div>

            <div>
              <h2 className="mb-4 font-display text-lg font-bold uppercase">Open challenges</h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {lobby
                    .map((c, i) => (
                      <motion.div
                        key={c.id}
                        layout
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -60, scale: 0.9 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ scale: 1.015, x: 4 }}
                        className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex size-12 items-center justify-center rounded-xl font-display font-black text-black" style={{ background: gradientOf(game) }}>
                            {c.name[0]}
                          </div>
                          <div>
                            <p className="font-bold">{c.name}</p>
                            <p className="text-sm text-white/50">
                              {c.rank} · {c.winRate}% wins · {c.mode}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-display text-lg font-bold">🪙 {c.stake}</p>
                          <GlowButton colors={game.colors} onClick={() => accept(c)} disabled={busy || points < c.stake} className="!px-4 !py-2">
                            Accept
                          </GlowButton>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {!lobby.length && <p className="text-white/50">No open challenges. Post your own!</p>}
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'versus' && (
          <motion.div key="versus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center">
              <PlayerCard name={player.name} sub={`${game.idLabel}: ${player.uid}`} game={game} side="left" />
              <motion.div
                key={count}
                initial={{ scale: 2.4, opacity: 0, rotateZ: -20 }}
                animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
                className="text-center font-display text-6xl font-black"
                style={{ color: game.colors.from, textShadow: `0 0 30px rgba(${game.colors.glow},0.8)` }}
              >
                {count > 0 ? count : 'VS'}
              </motion.div>
              <PlayerCard name={match.opp.name} sub={match.opp.sub} game={game} side="right" />
            </div>
            <p className="mt-8 text-center text-xl text-white/60">
              {match.mode} · Pot 🪙 {match.stake * 2}
            </p>
          </motion.div>
        )}

        {stage === 'playing' && (
          <motion.div key="playing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.4em]" style={{ color: game.colors.from }}>
              Match live
            </p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase">
              You vs {match.opp.name}
            </h2>
            <p className="mt-3 text-white/60">Create a custom room in {game.short} with the details below and play the match.</p>
            <div className={`mt-5 grid gap-3 font-display ${match.pass ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="rounded-xl bg-black/40 p-4">
                <p className="text-xs uppercase text-white/40">{game.hasPassword ? 'Room ID' : 'Room code'}</p>
                <p className="text-2xl font-bold">{match.room}</p>
              </div>
              {match.pass && (
                <div className="rounded-xl bg-black/40 p-4">
                  <p className="text-xs uppercase text-white/40">Password</p>
                  <p className="text-2xl font-bold">{match.pass}</p>
                </div>
              )}
            </div>
            <p className="mt-5 text-white/60">When the match ends, upload a screenshot of the final result screen so we can verify it, then report:</p>
            <div className="mt-3 text-left">
              <ScreenshotPicker label="Result screenshot" file={shot} onChange={setShot} disabled={busy} />
            </div>
            <div className="mt-3 flex justify-center gap-4">
              <GlowButton colors={game.colors} onClick={() => report(true)} disabled={busy || !shot}>
                I won
              </GlowButton>
              <GlowButton colors={game.colors} variant="outline" onClick={() => report(false)} disabled={busy || !shot}>
                I lost
              </GlowButton>
            </div>
          </motion.div>
        )}

        {stage === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
            <div className="shimmer rounded-2xl p-6">
              <p className="font-display text-sm uppercase tracking-widest">Waiting for {match.opp.name} to report…</p>
              <p className="mt-2 text-white/60">Your screenshot is saved. If you both agree, the pot is paid out automatically. If not, an admin compares the screenshots.</p>
            </div>
          </motion.div>
        )}

        {stage === 'disputed' && (
          <motion.div key="disputed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
            <div className="text-6xl">⚖️</div>
            <h2 className="mt-3 font-display text-2xl font-black uppercase">Under review</h2>
            <p className="mt-2 text-white/70">You and {match.opp.name} reported conflicting results. An admin will check and settle the pot.</p>
            <div className="mt-6">
              <GlowButton colors={game.colors} onClick={reset}>
                Back to lobby
              </GlowButton>
            </div>
          </motion.div>
        )}

        {stage === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.5, rotateX: 60 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 12 }}
            style={{ transformPerspective: 900 }}
            className="glass mx-auto max-w-lg rounded-3xl p-10 text-center"
          >
            <div className="text-7xl">{result.refunded ? '↩️' : result.won ? '🏆' : '💀'}</div>
            <h2 className="mt-3 font-display text-4xl font-black uppercase" style={{ color: result.won || result.refunded ? game.colors.from : '#f87171' }}>
              {result.refunded ? 'Refunded' : result.won ? 'Victory' : 'Defeat'}
            </h2>
            <p className="mt-2 text-xl text-white/70">
              {result.refunded ? 'An admin cancelled this match and refunded your stake.' : result.won ? `+${result.payout} points (after ${PLATFORM_FEE * 100}% fee)` : `You lost ${match.stake} points. Rematch?`}
            </p>
            <div className="mt-6">
              <GlowButton colors={game.colors} onClick={reset}>
                Back to lobby
              </GlowButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
