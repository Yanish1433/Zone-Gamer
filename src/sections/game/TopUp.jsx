import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api, imageProblem, uploadImage } from '../../api'
import Field from '../../components/ui/Field'
import GlowButton from '../../components/ui/GlowButton'
import Modal from '../../components/ui/Modal'
import ScreenshotPicker from '../../components/ui/ScreenshotPicker'
import TiltCard from '../../components/ui/TiltCard'
import { useApp } from '../../context/AppContext'
import { PAYMENT_METHODS, TOPUP_PACKS } from '../../data/games'

const QR_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/payment/qr`

const STATUS_STYLE = { pending: 'text-amber-400', approved: 'text-emerald-400', rejected: 'text-red-400' }

export default function TopUp({ game }) {
  const { topUp, toast, refresh } = useApp()
  const [pack, setPack] = useState(null)
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [step, setStep] = useState('choose') // choose | pay
  const [info, setInfo] = useState(null) // { payeeName, instructions, hasQr }
  const [code, setCode] = useState('')
  const [shot, setShot] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [requests, setRequests] = useState([])

  const loadRequests = () => api('/topups').then(setRequests).catch(() => {})
  useEffect(() => {
    loadRequests()
    api('/payment/info').then(setInfo).catch(() => setInfo({ hasQr: false }))
  }, [])
  const unavailable = info?.hasQr === false

  const open = (p) => {
    if (unavailable) return toast('Top-ups are temporarily unavailable. Please try again later.', 'error')
    setPack(p)
    setStep('choose')
    setCode('')
    setShot(null)
    setErrors({})
  }
  const close = () => !busy && setPack(null)

  const toPay = () => setStep('pay')

  // The player pays to the QR, then sends the payment code and a screenshot. An admin checks both
  // and approves; the server prices the pack, so nothing here decides how many points are credited.
  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (code.trim().length < 4) next.code = 'Enter the payment code from your transaction'
    const problem = imageProblem(shot)
    if (problem) next.shot = problem
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const screenshotId = await uploadImage(shot, 'topup')
      const { error, status, credited } = await topUp(game.id, pack.id, method, code.trim(), screenshotId)
      if (error) return setErrors({ code: error })
      toast(status === 'approved' ? `+${credited} points added` : 'Payment sent for review. Points are added once we confirm it.', 'success')
      setPack(null)
      loadRequests()
      refresh()
    } catch (ex) {
      setErrors({ shot: ex.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {unavailable && (
        <p role="alert" className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Top-ups are not available right now because payments are still being set up. Please check back soon or contact support.
        </p>
      )}
      <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-4 ${unavailable ? 'pointer-events-none opacity-50' : ''}`}>
        {TOPUP_PACKS.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} style={{ perspective: 900 }}>
            <button onClick={() => open(p)} className="block w-full text-left">
              <TiltCard glow={game.colors.glow} className="glass h-full rounded-3xl p-6">
                {p.tag && (
                  <span className="absolute -top-3 right-4 rounded-full px-3 py-0.5 font-display text-[10px] font-bold uppercase text-black" style={{ background: game.colors.from }}>
                    {p.tag}
                  </span>
                )}
                <div className="text-5xl [transform:translateZ(50px)]">🪙</div>
                <p className="mt-3 font-display text-3xl font-black [transform:translateZ(30px)]">{p.points.toLocaleString()}</p>
                <p className="h-6 text-emerald-400">{p.bonus ? `+${p.bonus} bonus` : ''}</p>
                <p className="mt-3 font-display text-lg font-bold" style={{ color: game.colors.from }}>
                  Rs {p.price}
                </p>
              </TiltCard>
            </button>
          </motion.div>
        ))}
      </div>

      {requests.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-white/60">Your top-up requests</h3>
          <div className="space-y-2">
            {requests.slice(0, 5).map((r) => (
              <div key={r.id} className="glass flex items-center justify-between rounded-xl px-4 py-3">
                <div>
                  <p className="font-semibold">
                    🪙 {r.points.toLocaleString()} · Rs {r.price}
                  </p>
                  <p className="text-sm text-white/40">{new Date(r.at).toLocaleString()}</p>
                </div>
                <p className={`font-display text-sm font-bold uppercase ${STATUS_STYLE[r.status]}`}>{r.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={Boolean(pack)} onClose={close} title={step === 'choose' ? 'Complete top-up' : `Pay Rs ${pack?.price}`}>
        {pack && step === 'choose' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-black/40 p-4">
              <p className="text-white/60">You get</p>
              <p className="font-display text-2xl font-black">🪙 {(pack.points + pack.bonus).toLocaleString()} points</p>
              <p className="text-white/60">for Rs {pack.price}</p>
            </div>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${method === m ? 'border-white/60 bg-white/10' : 'border-white/10'}`}>
                  <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} className="accent-fuchsia-500" />
                  {m}
                </label>
              ))}
            </div>
            <GlowButton colors={game.colors} onClick={toPay} className="w-full">
              {`Continue to pay Rs ${pack.price}`}
            </GlowButton>
          </div>
        )}

        {pack && step === 'pay' && (
          <form onSubmit={submit} noValidate className="space-y-5">
            <div className="rounded-2xl bg-black/40 p-4 text-center">
              {info === null ? (
                <p className="py-10 text-white/50">Loading…</p>
              ) : info.hasQr ? (
                <>
                  <p className="mb-3 text-white/60">
                    Scan to pay <b className="text-white">Rs {pack.price}</b> via {method}
                  </p>
                  <img src={QR_URL} alt="Payment QR code" className="mx-auto w-full max-w-[240px] rounded-xl bg-white p-2" />
                  {info.payeeName && <p className="mt-3 font-display font-bold">{info.payeeName}</p>}
                </>
              ) : (
                <p className="py-6 text-red-300">Payments are not set up yet. Please contact support.</p>
              )}
              {info?.instructions && <p className="mt-2 text-sm text-white/50">{info.instructions}</p>}
            </div>

            <p className="text-sm text-white/60">After paying, enter the payment code (transaction ID) from your receipt and add a screenshot. We check them and add your points.</p>
            <Field label="Payment code" placeholder="e.g. TXN123456789" value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} disabled={busy} />
            <ScreenshotPicker label="Payment screenshot" file={shot} onChange={setShot} disabled={busy} />
            {errors.shot && <p className="text-sm text-red-400">{errors.shot}</p>}

            <div className="flex gap-3">
              <GlowButton variant="outline" type="button" onClick={() => setStep('choose')} disabled={busy}>
                Back
              </GlowButton>
              <GlowButton type="submit" colors={game.colors} disabled={busy || info?.hasQr === false} className="flex-1">
                {busy ? 'Sending…' : 'I have paid · Submit'}
              </GlowButton>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
