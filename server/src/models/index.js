import mongoose from 'mongoose'

const { Schema } = mongoose
const ref = (model, extra = {}) => ({ type: Schema.Types.ObjectId, ref: model, ...extra })

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    banned: { type: Boolean, default: false },
    // `winnings` is the part of `points` that came from winning and can be redeemed.
    points: { type: Number, default: 0, min: 0 },
    winnings: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)
export const User = mongoose.model('User', userSchema)

const profileSchema = new Schema(
  {
    user: ref('User', { required: true }),
    gameId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    uid: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)
profileSchema.index({ user: 1, gameId: 1 }, { unique: true })
// one in-game ID belongs to one account
profileSchema.index({ gameId: 1, uid: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })
export const GameProfile = mongoose.model('GameProfile', profileSchema)

const txSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    type: { type: String, required: true }, // topup | stake | refund | win | entry | prize | redeem | admin
    delta: { type: Number, required: true },
    label: { type: String, required: true },
    gameId: String,
    ref: Schema.Types.ObjectId,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)
export const Transaction = mongoose.model('Transaction', txSchema)

const topupSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    gameId: String,
    packId: String,
    points: { type: Number, required: true },
    price: { type: Number, required: true },
    method: { type: String, required: true },
    reference: { type: String, trim: true }, // payment / transaction code the player sent
    screenshot: ref('Upload'), // proof of payment
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    note: String,
  },
  { timestamps: true },
)
export const Topup = mongoose.model('Topup', topupSchema)

const redeemSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    points: { type: Number, required: true },
    amount: { type: Number, required: true }, // Rs
    method: { type: String, required: true },
    account: { type: String, required: true },
    status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending', index: true },
    note: String,
  },
  { timestamps: true },
)
export const Redeem = mongoose.model('Redeem', redeemSchema)

const reportEnum = { type: String, enum: ['won', 'lost', null], default: null }

const challengeSchema = new Schema(
  {
    gameId: { type: String, required: true, index: true },
    creator: ref('User', { required: true }),
    opponent: ref('User'),
    stake: { type: Number, required: true },
    teamSize: { type: Number, default: 1 },
    mode: { type: String, required: true },
    room: { type: String, required: true },
    pass: { type: String, default: '' },
    status: { type: String, enum: ['open', 'matched', 'completed', 'disputed', 'cancelled'], default: 'open', index: true },
    reports: { creator: reportEnum, opponent: reportEnum },
    shots: { creator: ref('Upload'), opponent: ref('Upload') }, // result screenshots
    winner: ref('User'),
    payout: Number,
    resolvedByAdmin: Boolean,
  },
  { timestamps: true },
)
export const Challenge = mongoose.model('Challenge', challengeSchema)

const tournamentSchema = new Schema(
  {
    gameId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    map: { type: String, default: '', trim: true },
    mode: { type: String, default: 'Squad', trim: true },
    startsAt: { type: Date, required: true },
    prize: { type: Number, required: true, min: 0 },
    entry: { type: Number, required: true, min: 0 },
    slots: { type: Number, required: true, min: 1 },
    filled: { type: Number, default: 0 },
    status: { type: String, enum: ['upcoming', 'live', 'completed', 'cancelled'], default: 'upcoming' },
    roomInfo: { type: String, default: '' }, // shown to registered teams only
  },
  { timestamps: true },
)
export const Tournament = mongoose.model('Tournament', tournamentSchema)

const registrationSchema = new Schema(
  {
    tournament: ref('Tournament', { required: true }),
    user: ref('User', { required: true }),
    gameId: { type: String, required: true },
    team: { name: { type: String, required: true }, players: [String] },
    refunded: { type: Boolean, default: false },
    prizeAwarded: { type: Number, default: 0 },
  },
  { timestamps: true },
)
registrationSchema.index({ tournament: 1, user: 1 }, { unique: true })
export const Registration = mongoose.model('Registration', registrationSchema)

// Image proofs (payment and match screenshots) and the payment QR. Files live in server/uploads.
const uploadSchema = new Schema(
  {
    owner: ref('User', { required: true, index: true }),
    purpose: { type: String, enum: ['topup', 'match', 'qr'], required: true },
    file: { type: String, required: true }, // generated name, never user supplied
    mime: { type: String, required: true },
    size: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)
export const Upload = mongoose.model('Upload', uploadSchema)

// Single document holding what players see on the payment page.
const settingsSchema = new Schema({
  key: { type: String, unique: true },
  payeeName: { type: String, default: '' },
  instructions: { type: String, default: '' },
  qr: ref('Upload'),
})
export const Settings = mongoose.model('Settings', settingsSchema)
export const getPaymentSettings = () => Settings.findOneAndUpdate({ key: 'payment' }, { $setOnInsert: { key: 'payment' } }, { upsert: true, new: true })
