// Game logo image cropped to fill its box; the parent sets the size and radius via className.
export default function GameLogo({ game, className = '' }) {
  return <img src={game.logo} alt={`${game.name} logo`} draggable={false} className={`size-full object-cover ${className}`} />
}
