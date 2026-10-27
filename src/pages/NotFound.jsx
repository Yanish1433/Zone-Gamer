import GlowButton from '../components/ui/GlowButton'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="font-display text-7xl font-black">404</p>
      <p className="mt-3 text-xl text-white/60">This zone doesn't exist.</p>
      <div className="mt-8">
        <GlowButton to="/">Back home</GlowButton>
      </div>
    </div>
  )
}
