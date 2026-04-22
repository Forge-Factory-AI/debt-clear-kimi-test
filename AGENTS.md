# DebtClear — Agent Guide

## Project

**Name:** DebtClear  
**Type:** Full-stack debt tracker with dark fintech UI  
**Stack:** TypeScript, React 18 (Vite), Express.js, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui

## Quick Start

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start frontend (5173) + backend (3001)
pnpm test             # Run all tests
pnpm build            # Build for production
```

## Monorepo Layout

```
packages/
  backend/            # Express API
    src/              # Routes, middleware, services
    prisma/           # Schema + migrations
  frontend/           # React SPA
    src/              # Components, pages, hooks
```

## Key Conventions

- **TypeScript strict mode** enabled in both packages
- **ES Modules** (`"type": "module"`) throughout
- **Backend:** Express route handlers in `src/`, Prisma client for DB access
- **Frontend:** React functional components, Tailwind for styling, `cn()` utility for class merging
- **Tests:** Vitest in both packages; backend uses supertest, frontend uses Testing Library

## API Surface

- `GET /api/health` — Health check
- Auth routes (register/login) — JWT-based
- Debt CRUD routes — Protected
- Payment routes — Protected

## Database Schema

Models: `User` → `Debt` → `Payment` (cascade delete)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Signing key for auth tokens
- `PORT` — Backend server port (default 3001)

## Agent Directives

1. Prefer existing shadcn/ui patterns for new UI components.
2. Add Prisma migrations for any schema changes.
3. Keep backend routes thin; business logic belongs in service functions.
4. Frontend API calls should use a centralized client (create one if missing).
5. Run `pnpm test` before committing; architecture tests must pass.
