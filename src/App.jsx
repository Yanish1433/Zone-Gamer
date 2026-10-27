import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthGuard, GameGuard, PlayerGuard, TournamentGuard } from './components/layout/Guards'
import Layout from './components/layout/Layout'
import { AppProvider } from './context/AppContext'
import GameHub from './pages/GameHub'
import GameSignup from './pages/GameSignup'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import OneVsOne from './pages/OneVsOne'
import Redeem from './pages/Redeem'
import Tournament from './pages/Tournament'
import Wallet from './pages/Wallet'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route element={<AuthGuard />}>
              <Route path="redeem" element={<Redeem />} />
              <Route path="game/:gameId" element={<GameGuard />}>
                <Route path="signup" element={<GameSignup />} />
                <Route element={<PlayerGuard />}>
                  <Route index element={<GameHub />} />
                  <Route path="1v1" element={<OneVsOne />} />
                  <Route path="wallet" element={<Wallet />} />
                  <Route element={<TournamentGuard />}>
                    <Route path="tournament" element={<Tournament />} />
                  </Route>
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
