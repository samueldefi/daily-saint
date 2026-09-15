# The Daily Saint

Studio for Instagram saint-quote cards (1080×1350).

## Run

```
npm install
npm run dev
```

Open http://localhost:3000

## Quote database on Vercel

1. Import this GitHub repo in Vercel.
2. Storage (or Marketplace) → Neon → free plan → connect.
3. Redeploy so the app can read `DATABASE_URL`.
4. Open Quotes and import your JSON.

Clearing the browser cache does not remove quotes after Neon is connected.

Import skips a quote when the text and saint already match. Search covers text, saint, and feast day. Export JSON anytime as a backup.

## Use

1. Add or import quotes (`text`, `saint`, `feastDay`).
2. Upload background photos (photos still live in this browser).
3. In Studio, start from a random pair.
4. Shuffle or choose a background if the photo does not fit.
5. Set greyscale, overlay colour, overlay opacity, and grain.
6. Download the card. That quote is marked used in the database.

The old Streamlit app is in `legacy/`.
