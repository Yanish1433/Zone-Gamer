import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, NavLink, useMatch } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { GAMES } from '../../data/games'
import AnimatedNumber from '../ui/AnimatedNumber'

const LINKS = [{ to: '/', label: 'Home', end: true }, ...GAMES.map((g) => ({ to: `/game/${g.id}`, label: g.short })), { to: '/redeem', label: 'Redeem' }]

const scrollToContact = () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })

export default function Navbar() {
  const { points, players, user, logout } = useApp()
  const [open, setOpen] = useState(false)
  // Navbar sits outside the game route, so read the game from the URL; fall back to a signed-up game.
  const match = useMatch('/game/:gameId/*')
  const walletGameId = players[match?.params.gameId] ? match.params.gameId : Object.keys(players)[0] ?? GAMES[0].id

  const linkClass = ({ isActive }) =>
    `relative px-3 py-2 font-display text-xs font-bold uppercase tracking-widest transition ${
      isActive ? 'text-white' : 'text-white/55 hover:text-white'
    }`

  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0 bg-ink/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <Link to="/" className="shrink-0 font-display text-lg font-black tracking-widest sm:text-xl">
          ZONE<span className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">GAMER</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded bg-gradient-to-r from-fuchsia-500 to-cyan-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {user && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass flex items-center gap-2 rounded-full px-3 py-1.5 font-display text-xs font-bold sm:px-4 sm:text-sm"
              title="Your game points"
            >
              <span>🪙</span>
              <AnimatedNumber value={points} />
              <Link
                to={`/game/${walletGameId}/wallet`}
                aria-label="Buy points"
                title="Buy points"
                className="ml-1 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-base font-black leading-none text-black transition hover:scale-110"
              >
                +
              </Link>
            </motion.div>
          )}
          <button
            onClick={scrollToContact}
            className="hidden items-center gap-2 rounded-xl border border-cyan-400/40 px-4 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-400/10 sm:inline-flex"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
            </span>
            Help
          </button>
          {user ? (
            <button onClick={logout} title={user.email} className="rounded-xl border border-white/20 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-white/80 transition hover:border-white/60 hover:text-white sm:px-4 sm:text-xs sm:tracking-widest">
              Log out
            </button>
          ) : (
            <Link to="/login" className="rounded-xl border border-white/20 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-white/80 transition hover:border-white/60 hover:text-white sm:px-4 sm:text-xs sm:tracking-widest">
              Log in
            </Link>
          )}
          <button
            className="rounded-lg px-2 text-2xl md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden md:hidden"
          >
            <div className="flex max-h-[70dvh] flex-col overflow-y-auto px-4 pb-4">
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
              <button
                onClick={() => {
                  setOpen(false)
                  scrollToContact()
                }}
                className="px-3 py-2 text-left font-display text-xs font-bold uppercase tracking-widest text-cyan-300"
              >
                Help / Contact
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
