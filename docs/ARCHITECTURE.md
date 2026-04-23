# DebtClear Architecture

## Layer Rules

### Backend Layer Cake

```
HTTP          Express routes (packages/backend/src/routes/)
Business      Service layer (packages/backend/src/services/) - TBD
Data Access   Prisma Client (generated from schema.prisma)
Storage       PostgreSQL
```

Rules:
1. Routes import only from `services/` or Prisma client.
2. Services import only from Prisma client or shared types.
3. No Express code in services. No Prisma in routes beyond passing-through.
4. Never import frontend code.

### Frontend Layer Cake

```
Pages         Route-level components (packages/frontend/src/App.tsx + pages/)
Features      Domain-specific sections (features/)
Components    Reusable UI primitives (packages/frontend/src/components/ui/)
Lib           Utilities, hooks, API client (packages/frontend/src/lib/)
```

Rules:
1. Pages import from features, components, and lib.
2. Features import from components and lib only.
3. Components import only from lib (utils) and external packages.
4. Never import backend code.

## Module Inventory

### Backend

| Module | Path | Responsibility |
|--------|------|----------------|
| app | `src/app.ts` | Express app setup, middleware, route mounting |
| index | `src/index.ts` | Server bootstrap (port binding) |
| health | `src/routes/health.ts` | Health check endpoint |

### Frontend

| Module | Path | Responsibility |
|--------|------|----------------|
| App | `src/App.tsx` | Root component |
| main | `src/main.tsx` | ReactDOM root mount |
| button | `src/components/ui/button.tsx` | shadcn/ui Button primitive |
| utils | `src/lib/utils.ts` | `cn()` Tailwind class merger |

### Database Schema

| Model | Key Fields | Relations |
|-------|------------|-----------|
| User | id, email, password | hasMany Debt |
| Debt | name, creditor, originalAmount, remainingAmount, interestRate, dueDate, isArchived, isPaidOff | belongsTo User, hasMany Payment |
| Payment | amount, paidAt | belongsTo Debt |

## Dependency Flow

```
frontend (Vite dev server) --proxy /api--> backend (Express on :3001) --Prisma--> PostgreSQL
```

## Future Additions

- `packages/backend/src/services/` - Business logic services
- `packages/backend/src/middleware/` - Auth middleware
- `packages/frontend/src/pages/` - Route pages
- `packages/frontend/src/features/` - Domain features
- `packages/frontend/src/lib/api.ts` - API client
