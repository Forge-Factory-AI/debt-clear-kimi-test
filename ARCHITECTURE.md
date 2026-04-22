# Architecture

## Layer Rules

### Backend Layers (top to bottom)

| Layer | Responsibility | May Import From |
|-------|---------------|-----------------|
| Routes | HTTP request/response handling | Middleware, Services, Prisma types |
| Middleware | Auth, validation, error handling | Services, Prisma types |
| Services | Business logic, DB operations | Prisma client, Zod schemas |
| Prisma | Schema, migrations, generated client | — |

**Rule:** Routes may not import directly from the Prisma client. Go through services.

### Frontend Layers

| Layer | Responsibility |
|-------|---------------|
| Pages | Route-level components, data fetching |
| Components | Reusable UI pieces (shadcn/ui + custom) |
| Hooks | Shared stateful logic (data fetching, auth) |
| Lib | Utilities (`cn()`, API client) |

**Rule:** Pages may import from all layers below. Components may not import from Pages.

## Module Inventory

### Backend (`packages/backend/src/`)

| Module | Purpose |
|--------|---------|
| `app.ts` | Express app setup, middleware registration |
| `index.ts` | Server bootstrap, port binding |
| `routes/` | API route definitions (expected) |
| `middleware/` | Auth, error handlers (expected) |
| `services/` | Business logic (expected) |

### Frontend (`packages/frontend/src/`)

| Module | Purpose |
|--------|---------|
| `App.tsx` | Root component, routing (expected) |
| `main.tsx` | React DOM entry |
| `index.css` | Tailwind directives, CSS variables |
| `lib/utils.ts` | `cn()` class merging utility |
| `components/` | shadcn/ui + custom components (expected) |
| `pages/` | Route-level views (expected) |
| `hooks/` | Custom React hooks (expected) |

## Data Flow

```
User → Frontend (React) → Vite dev proxy → Backend (Express)
                                    ↓
                              Prisma Client
                                    ↓
                              PostgreSQL
```

## Dependency Boundaries

- Frontend must not import backend code directly.
- Backend must not import frontend code.
- Shared types should live in a dedicated package or be duplicated with a sync check.
