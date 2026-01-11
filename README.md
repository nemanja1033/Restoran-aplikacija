# Restaurant Finance (Serbian UI)

Production-ready finance tracker for restaurants / local businesses. The UI is in Serbian (Latin). The accounting model follows **Option A**:

- **Expenses create obligations (payables)** and do not reduce the account balance by default.
- **Payments are cash-out** and reduce the account balance.
- **Supplier debt** increases from supplier expenses and decreases from supplier payments.
- **Incomes** always increase balance by **net amount** (delivery fee deducted).
- **"Plaćeno odmah?"** on supplier expenses automatically creates a payment to avoid double counting.

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + SQLite (migrations)
- Zod + React Hook Form
- Excel export via `xlsx`

## Setup

```bash
npm install
```

Local database (SQLite):

```bash
npm run db:reset
npm run db:seed
```

Run dev:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment (LibSQL/Turso)
Vercel does not allow local SQLite files. Use a LibSQL/Turso database:

- `DATABASE_URL=libsql://...`
- `LIBSQL_AUTH_TOKEN=...`

Then deploy. The app can bootstrap missing tables at runtime, but **migrations are included** in `prisma/migrations`.

## Accounting Model (Option A)

### Incomes
- **Dostava**: fee deducted → `netAmount = amount - fee`.
- **Lokal**: no fee → `netAmount = amount`.
- **Balance impact**: `+ netAmount`.

### Expenses
- Stored with **gross, net, PDV% and PDV amount**.
- **Do NOT** reduce balance by default (they create obligations).
- Types: **Dobavljač / Plate / Ostalo**.
- Supplier expenses increase supplier debt.
- **Paid now** (`Plaćeno odmah?`) auto-creates a Payment for the same supplier + amount.

### Payments (Uplate)
- Cash outflows reduce balance.
- If supplier is selected, they reduce supplier debt.
- Payments larger than current supplier debt are blocked by default (confirm to allow overpay/credit).

### Balance
`runningBalance = startingBalance + cumulative(incomeNet - payments)`

## Receipts (Računi)
- File upload (image/PDF) on expenses.
- In dev, files are stored **locally** in `public/uploads`.
- `StorageProvider` interface is in `src/lib/storage.ts` for future S3 integration.

**Limitation / TODO**:
- On Vercel, local file storage is ephemeral. Replace `LocalStorageProvider` with S3/Blob storage.

## Excel Export
**Button: “Izvezi u Excel”**

Sheets:
1. **Knjiga** (ledger of events: income / expense / payment)
2. **Dobavljači** (supplier totals)
3. **PDV** (totals by month)

## Scripts
- `npm run db:reset` – reset SQLite db
- `npm run db:seed` – seed data
- `npm run db:studio` – Prisma Studio
- `npm run dev` – dev server
- `npm run build` – production build
- `npm run test` – unit tests

## Tests
Basic unit tests cover:
- PDV breakdown calculation
- Delivery fee calculation
- Running balance (ledger)

Tests live in `tests/`.
