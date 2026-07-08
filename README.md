# Gas Refill Calculator

A digital-scale terminal for LPG (cooking gas) refills. Fully client-side: no backend, no database, `localStorage` only.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**.

## Features

- **Two fill modes**
  - **Price** the customer pays: `finalKg = CSR + (price / GSP)`
  - **Kg** the customer wants: `finalKg = CSR + kg`
- **Strict 2-decimal precision** via truncation (no rounding). `3.088 â†’ 3.08`. Float drift is scrubbed with `toPrecision(15)` before truncation, so a value stored as `3.0799999` never collapses to `3.07`. Intermediate math stays full-precision; truncation happens only at display.
- **Editable GSP** (default â‚¦1,700/kg) that persists as the new default across sessions.
- **Validation**: blocks negatives, GSP = 0 (division by zero), and empty required fields with inline errors.
- **Daily sales summary**: today's kg sold, revenue, and fill count, plus per-day subtotals in the log.
- **Transaction log** grouped by day, persisted in `localStorage`.
- **Delete** any logged entry.
- **Receipts**: per-transaction printable / copyable / shareable text block.
- **Real sharing** via the Web Share API (native share sheet on mobile / supported browsers), with clipboard fallback. Share a single receipt or a whole day's summary.

## File structure

```
gas-refill-calculator/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ globals.css      # all styling (design tokens + component styles)
â”‚   â”œâ”€â”€ layout.tsx       # root layout, font, metadata
â”‚   â””â”€â”€ page.tsx         # the app (client component)
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ precision.ts     # trunc2 / fmt2 / naira / kg / parseField
â”‚   â”œâ”€â”€ storage.ts       # safe localStorage wrapper (SSR + sandbox safe)
â”‚   â””â”€â”€ types.ts         # Transaction + FillMode types
â”œâ”€â”€ .gitignore
â”œâ”€â”€ next.config.mjs
â”œâ”€â”€ package.json
â”œâ”€â”€ postcss.config.mjs
â”œâ”€â”€ tailwind.config.ts
â””â”€â”€ tsconfig.json
```

> Note: `app/page.tsx`, `app/layout.tsx`, and `app/globals.css` go inside the `app/` folder. `precision.ts`, `storage.ts`, and `types.ts` go inside the `lib/` folder. The rest sit at the repo root.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel from GitHub

1. Create a new GitHub repo and push these files:
   ```bash
   git init
   git add .
   git commit -m "Gas Refill Calculator"
   git branch -M main
   git remote add origin https://github.com/<you>/gas-refill-calculator.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset auto-detects **Next.js**. Leave build settings default.
4. Click **Deploy**. Auto-deploys on every push after that.

Because sharing uses the Web Share API, it works best over HTTPS, which Vercel provides out of the box.