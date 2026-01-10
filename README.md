# Finansije restorana

Aplikacija za dnevno praćenje finansija restorana ili lokalnog biznisa. Uključuje računsko stanje po danima, prihode, troškove, dobavljače, izvoz u Excel i podešavanja.

## Tehnologije
- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- SQLite + Prisma ORM
- React Hook Form + Zod validacija
- Excel export: SheetJS (xlsx)

## Pokretanje projekta

```bash
npm install
```

Priprema baze i seed podataka:

```bash
npm run db:reset
npm run db:seed
```

Pokretanje u development modu:

```bash
npm run dev
```

Otvorite `http://localhost:3000`.

> Napomena: `db:reset` briše lokalnu bazu i kreira šemu iz `schema.prisma`.

## Vercel deployment
Vercel ne podržava lokalni SQLite fajl, pa je za demo potrebno koristiti LibSQL/Turso.

1) Kreirajte bazu u Turso (ili drugom LibSQL provideru).
2) U Vercel podešavanjima dodajte env varijable:
   - `DATABASE_URL=libsql://...`
   - `LIBSQL_AUTH_TOKEN=...`
3) Deploy.

Za lokalni razvoj i dalje se koristi `file:./dev.db`.

## Logika obračuna

Za svaki datum:
- **Prihod u lokalu** = suma svih `IN_STORE` prihoda
- **Prihod od dostave (bruto)** = suma svih `DELIVERY` prihoda
- **Provizija dostave** = delivery_amount × feePercent / 100
- **Neto prihod dostave** = delivery_amount − provizija
- **Neto prihod ukupno** = prihod u lokalu + neto prihod dostave
- **Troškovi sa računa** = suma troškova sa `ACCOUNT` metodom
- **Troškovi gotovina** = suma troškova sa `CASH` metodom
- **Neto promena na računu** = neto prihod ukupno − troškovi sa računa
- **Stanje na računu** = početno stanje + kumulativna neto promena

## Excel izvoz
- Eksportuje dva sheet-a: `Dnevni pregled` i `Transakcije`
- Poštuje izabrani datum opseg
- Ime fajla: `finance_export_YYYY-MM-DD_to_YYYY-MM-DD.xlsx`

## Seed podaci
U `prisma/seed.ts` se kreira:
- 3 dobavljača (Meso, Peciva, Piće)
- 5–7 dana prihoda i troškova
- Jasno vidljive provizije za dostavu

## Struktura
- `src/app/(dashboard)` – UI stranice
- `src/app/api` – API rute
- `src/lib` – validacije, formatiranje i obračun
- `prisma` – schema, migracije i seed

## Komande
- `npm run db:push` – sinhronizacija šeme sa bazom
- `npm run db:reset` – reset baze
- `npm run db:seed` – seed podaci
- `npm run db:studio` – Prisma Studio
- `npm run dev` – razvoj
- `npm run build` – produkcioni build
