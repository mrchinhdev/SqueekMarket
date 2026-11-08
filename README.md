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
