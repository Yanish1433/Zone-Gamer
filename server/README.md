# Zone Gamer backend

Express + MongoDB (Mongoose) API with JWT auth and an admin dashboard.

## Run

```bash
# 1. MongoDB must be running (mongodb://127.0.0.1:27017 by default)
# 2. Backend
cd server
npm install
npm run dev          # http://localhost:4000

# 3. Frontend (new terminal, project root)
npm run dev          # http://localhost:5173, /api is proxied to :4000
```

Admin dashboard: **http://localhost:4000/admin**. The admin account is created on first start from
`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env`. Change that password before going live.

## How the money works

- `points` is the balance; `winnings` is the part of it that came from winning and can be redeemed.
  Spending uses bought points first, then winnings.
- **Top-ups** are created as *pending*. An admin confirms the payment in the dashboard and the points
  are credited. Set `AUTO_APPROVE_TOPUPS=true` in `.env` for dev only (it gives free points).
  There is no payment gateway; plug one in at `POST /api/topups` in `src/routes/player.js`.
- **Redeems** take the points out of winnings immediately. An admin pays the money by hand, then marks
  it paid; rejecting returns the points.
- **1v1**: the stake is escrowed when a challenge is posted or accepted. Both players report; matching
  reports pay the winner `2 × stake − 10% fee`, conflicting reports go to *Disputed* for an admin.
- **Tournaments** are created in the dashboard. Registration charges the entry fee; cancelling refunds
  everyone; prizes are awarded per squad and count as redeemable winnings.

All balance changes are single atomic Mongo updates (no transactions needed on a standalone server)
and are logged in the `transactions` collection.

## API (all under `/api`, Bearer token)

| | |
|---|---|
| `POST /auth/register`, `/auth/login`, `GET /auth/me` | account + state |
| `POST /games/:gameId/signup` | link an in-game ID |
| `POST /topups`, `GET /topups` | request a top-up |
| `POST /redeems` | redeem winnings |
| `GET/POST /challenges`, `GET /challenges/active`, `GET /challenges/:id`, `DELETE /challenges/:id`, `POST /challenges/:id/accept`, `POST /challenges/:id/report` | 1v1 arena |
| `GET /tournaments?gameId=`, `POST /tournaments/:id/register` | tournaments |
| `/admin/*` | dashboard (admin role only) |
