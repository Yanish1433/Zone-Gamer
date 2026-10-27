import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Outlet, matchPath, useLocation } from 'react-router-dom'
import { DEFAULT_COLORS, getGame } from '../../data/games'
import AnimatedBackground from '../ui/AnimatedBackground'
import ToastHost from '../ui/ToastHost'
import Footer from './Footer'
import Navbar from './Navbar'

export default function Layout() {
  const { pathname } = useLocation()
  const gameId = matchPath('/game/:gameId/*', pathname)?.params.gameId
  const colors = getGame(gameId)?.colors ?? DEFAULT_COLORS

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <AnimatedBackground glow={colors.glow} />
      <Navbar />
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="min-h-[70vh]"
      >
        <Outlet />
      </motion.main>
      <Footer />
      <ToastHost />
    </>
  )
}
