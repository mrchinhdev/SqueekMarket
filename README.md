squeekchain-project: aca0f333-6bbf-406f-86df-1eb2f21ea5a2

# Squeek Market

Prediction market prototype for **Squeekchain** (hamster-powered toychain on Ethereum Sepolia).

## Features

- Wallet connection (wagmi + injected / WalletConnect) on Sepolia
- Display test $SQK balance
- Points system: **12 free points per day** (1 point = 1 bet)
- Unlimited SQK bets
- Backend (Next.js API routes + JSON file storage) for markets & bets
- Auto-resolve button that checks settled work from official Squeekchain API
- Live stats from `https://api.squeekchain.com/v1/status`
- English UI

## Run

```bash
cd squeek-prediction
npm install
npm run dev
```

Open http://localhost:3000

## Notes

- SQK contract (Sepolia): `0xd78a3956cF63164d1Fa1C622ad3c66623162Fa1e`
- Points and bets are stored in `data/*.json`
- Resolution is currently semi-demo (checks block height for milestone markets, random for others). Can be extended with more precise logic.
- For production: replace file storage with a real DB, add proper on-chain escrow, and improve resolve logic.

## Next steps

- On-chain betting / escrow
- Better odds / AMM pricing
- More resolve conditions (round work, daily totals, etc.)
- Leaderboard
