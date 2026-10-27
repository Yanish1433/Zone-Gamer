// Mirrors src/data/games.js in the frontend. The server is the source of truth for validation and prices.
export const GAMES = {
  pubg: {
    name: 'PUBG Mobile',
    idPattern: /^\d{8,12}$/,
    idLabel: 'PUBG Character ID',
    modes: ['TDM · Warehouse', 'TDM · Ruins', 'Sniper Duel'],
    customMode: true,
    maxTeam: 4,
    hasPassword: true,
    hasTournament: true,
  },
  freefire: {
    name: 'Free Fire',
    idPattern: /^\d{8,12}$/,
    idLabel: 'Free Fire ID',
    modes: ['Clash Squad', 'Lone Wolf', 'Gun Duel'],
    customMode: true,
    maxTeam: 4,
    hasPassword: true,
    hasTournament: true,
  },
  efootball: {
    name: 'eFootball',
    idPattern: /^[A-Za-z0-9]{6,12}$/,
    idLabel: 'eFootball ID',
    modes: ['Quick Match'],
    matchTimes: [6, 10, 15, 20],
    customMode: false,
    maxTeam: 2,
    hasPassword: false,
    hasTournament: false,
  },
}

export const GAME_IDS = Object.keys(GAMES)

export const POINTS_PER_RS = 1
export const PLATFORM_FEE = 0.1
export const MIN_STAKE = 10
export const MIN_REDEEM = 100
export const TOURNAMENT_TEAM_SIZE = 4

export const TOPUP_PACKS = [
  { id: 'p100', points: 100 },
  { id: 'p500', points: 500 },
  { id: 'p1000', points: 1000 },
  { id: 'p2500', points: 2500 },
].map((p) => ({ ...p, bonus: 0, price: p.points / POINTS_PER_RS }))

export const PAYMENT_METHODS = ['Mobile Wallet', 'Debit / Credit Card', 'Bank Transfer']
