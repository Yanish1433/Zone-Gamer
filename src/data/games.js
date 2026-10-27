import pubgLogo from '../assets/pubg-circle-battlegrounds-photo-23.png'
import freefireLogo from '../assets/freefire.jpg'
import efootballLogo from '../assets/efootball.webp'

// Static game config. Tournaments and top-up packs should come from the backend.

export const GAMES = [
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    short: 'PUBG',
    emoji: '🪖',
    logo: pubgLogo,
    tagline: 'Drop. Loot. Survive.',
    blurb: 'Battle royale showdowns on Erangel, Miramar and Sanhok.',
    colors: { from: '#fbbf24', to: '#ea580c', glow: '251,191,36' },
    chips: ['1v1', '🏆', '🎯'],
    hasTournament: true,
    idLabel: 'PUBG Character ID',
    idPlaceholder: 'e.g. 5123456789',
    idHint: '8–12 digits. Find it on your PUBG profile.',
    idPattern: /^\d{8,12}$/,
    modes: ['TDM · Warehouse', 'TDM · Ruins', 'Sniper Duel'],
    customMode: true, // players may type their own mode
    maxTeam: 4, // up to 4v4
    hasPassword: true,
    tournaments: [],
  },
  {
    id: 'freefire',
    name: 'Free Fire',
    short: 'Free Fire',
    emoji: '🔥',
    logo: freefireLogo,
    tagline: 'Ignite the Battleground.',
    blurb: 'Fast 10-minute drops with Clash Squad and full-map Bermuda.',
    colors: { from: '#ff5a36', to: '#a855f7', glow: '255,90,54' },
    chips: ['1v1', '🏆', '💎'],
    hasTournament: true,
    idLabel: 'Free Fire ID',
    idPlaceholder: 'e.g. 1234567890',
    idHint: '8–12 digits. Tap your avatar in-game to see it.',
    idPattern: /^\d{8,12}$/,
    modes: ['Clash Squad', 'Lone Wolf', 'Gun Duel'],
    customMode: true,
    maxTeam: 4,
    hasPassword: true,
    tournaments: [],
  },
  {
    id: 'efootball',
    name: 'eFootball',
    short: 'eFootball',
    emoji: '⚽',
    logo: efootballLogo,
    tagline: 'Every Match. Every Goal.',
    blurb: 'Head-to-head matches against real players, stake your points.',
    colors: { from: '#22d3ee', to: '#3b82f6', glow: '34,211,238' },
    chips: ['1v1', '🥅', '🪙'],
    hasTournament: false,
    idLabel: 'eFootball ID',
    idPlaceholder: 'e.g. A1B2C3D4E',
    idHint: '6–12 letters or numbers. Found under Profile → User ID.',
    idPattern: /^[A-Za-z0-9]{6,12}$/,
    modes: ['Quick Match'], // single fixed mode
    matchTimes: [6, 10, 15, 20], // selectable match length (minutes)
    customMode: false,
    maxTeam: 2, // up to 2v2
    hasPassword: false, // room code only
    tournaments: [],
  },
]

export const getGame = (id) => GAMES.find((g) => g.id === id)

export const gradientOf = (game, angle = 135) =>
  `linear-gradient(${angle}deg, ${game.colors.from}, ${game.colors.to})`

export const DEFAULT_COLORS = { from: '#a855f7', to: '#22d3ee', glow: '168,85,247' }

export const STAKE_PRESETS = [50, 100, 250, 500]

// 1 Rs = 1 game point, for both top-ups and redeeming.
export const POINTS_PER_RS = 1

const pack = (id, points, tag) => ({ id, points, bonus: 0, price: points / POINTS_PER_RS, tag })

export const TOPUP_PACKS = [
  pack('p100', 100),
  pack('p500', 500),
  pack('p1000', 1000, 'Popular'),
  pack('p2500', 2500, 'Best value'),
]

export const PAYMENT_METHODS = ['Mobile Wallet', 'Debit / Credit Card', 'Bank Transfer']

// Smallest amount of points that can be redeemed in one request.
export const MIN_REDEEM = 100
export const PLATFORM_FEE = 0.1
