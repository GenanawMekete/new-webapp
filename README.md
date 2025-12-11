# Habesha Bingo - Frontend Starter (Vite + React)

Features:
- Telegram WebApp compatible (reads initData, attaches it to requests)
- Socket.IO client integration for real-time draws
- Card grid (1..400) with reserve flow
- Simple Game view with current call and BINGO button

How to run locally:
1. Install dependencies:
   ```bash
   npm ci
   ```
2. Set your backend URL in `.env` (create `.env` file):
   ```
   VITE_API_URL=http://localhost:3000
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

Notes:
- The app expects backend endpoints like `/api/cards` and Socket.IO at the same origin as `VITE_API_URL`.
- For Telegram WebApp use, host this frontend over HTTPS and register the domain with BotFather.
