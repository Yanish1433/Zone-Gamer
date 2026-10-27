import { Transaction, User } from '../models/index.js'

// Mongo standalone has no transactions, so every balance change is a single atomic update
// guarded by a filter. Spending uses bought points first, then winnings.
export async function debit(userId, amount, tx) {
  const user = await User.findOneAndUpdate(
    { _id: userId, points: { $gte: amount } },
    [
      {
        $set: {
          winnings: { $subtract: ['$winnings', { $max: [0, { $subtract: [amount, { $subtract: ['$points', '$winnings'] }] }] }] },
          points: { $subtract: ['$points', amount] },
        },
      },
    ],
    { new: true },
  )
  if (!user) return null
  await Transaction.create({ user: userId, delta: -amount, ...tx })
  return user
}

// `won` = the points count as redeemable winnings.
export async function credit(userId, amount, tx, won = false) {
  const user = await User.findByIdAndUpdate(userId, { $inc: { points: amount, winnings: won ? amount : 0 } }, { new: true })
  if (user) await Transaction.create({ user: userId, delta: amount, ...tx })
  return user
}

// Take points straight out of the redeemable winnings (redeem requests).
export async function debitWinnings(userId, amount, tx) {
  const user = await User.findOneAndUpdate(
    { _id: userId, winnings: { $gte: amount } },
    { $inc: { points: -amount, winnings: -amount } },
    { new: true },
  )
  if (!user) return null
  await Transaction.create({ user: userId, delta: -amount, ...tx })
  return user
}
