# DebtClear - Agent Instructions

## Project Overview

DebtClear is a full-stack debt tracker with a dark fintech UI. Users register, log in, add debts, track payments, and celebrate payoffs with confetti.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Package Manager**: pnpm (workspaces)
- **Test**: Vitest (frontend: jsdom, backend: node)

## Monorepo Structure

```
packages/
  backend/   Express API + Prisma
  frontend/  React SPA
```

## Key Commands

```bash
pnpm dev        # Start both frontend (5173) and backend (3001)
pnpm test       # Run all tests (both packages)
pnpm build      # Build both packages
pnpm db:generate  # Regenerate Prisma client
```

## Architecture Rules

1. **Backend layers** (top to bottom):
   - Routes handle HTTP (Express Router)
   - No business logic in routes; delegate to services (future)
   - Prisma client is the data access layer
   - Never import frontend code into backend

2. **Frontend layers**:
   - Pages/sections live in `src/` root
   - Reusable UI in `src/components/ui/`
   - Utilities in `src/lib/`
   - All API calls go through a single client (future)
   - Never import backend code into frontend

3. **Cross-package**:
   - Share only types via a future `types` package or duplicated interfaces
   - No direct file imports across packages

## Data Model

```
User -> Debt[] -> Payment[]
```

Key fields: `Debt.isArchived`, `Debt.isPaidOff`, `Debt.remainingAmount`

## UI Theme

- Dark mode only (`dark` class on root)
- Color tokens via CSS custom properties in `index.css`
- Tailwind config maps tokens to `hsl(var(--token))`
- shadcn/ui components use `cn()` for class merging

## Testing

- Backend: Vitest + supertest (integration tests)
- Frontend: Vitest + @testing-library/react + jsdom
- Architecture tests in `test/architecture/` (run with `pnpm test`)

## Common Pitfalls

- Prisma client must be regenerated after schema changes
- Frontend Vite proxy forwards `/api` to `localhost:3001`
- Dark theme is default; do not add a light mode toggle
- Use `Decimal` from Prisma for monetary values, not `number`

## Non-Goals (do not implement)

- Interest accrual, bank integrations, payment reminders
- OAuth, password reset, data export, admin panel
- Light mode, native mobile apps, social features
