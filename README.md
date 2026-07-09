# NetProfit

Zero-cloud, offline-first ledger and CRM for Wireless Internet Service Providers (WISPs).
Field operators log cash transactions on a phone with no internet connection; a companion
server on the operator's own PC syncs over LAN and serves a local dashboard. No subscriptions,
no cloud hosting, no customer data leaves the operator's own hardware.

See `research.md` for the full architecture writeup.

## Layout

- `backend/` - FastAPI + SQLAlchemy + SQLite. Device pairing/auth, LAN sync engine, CRM analytics.
- `web/` - Next.js desktop dashboard (CRM view, paired devices, pairing QR).
- `mobile/` - Expo/React Native field app (offline transaction/expense entry, sync).

## Quick start

Backend:
```
cd backend
pip install -e .
copy .env.example .env   # set DEVICE_TOKEN_SIGNING_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Web:
```
cd web
npm install
npm run dev
```

Mobile:
```
cd mobile
npm install
npx expo start
```
