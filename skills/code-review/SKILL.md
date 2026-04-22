# Code Review

## When to Use

Use this skill when reviewing code for correctness, quality, and adherence to project conventions.

## Review Checklist

### Type Safety

- [ ] No `any` types in new code unless absolutely unavoidable
- [ ] All function parameters and return types are explicit
- [ ] No TypeScript errors (`tsc --noEmit` passes)

### Testing

- [ ] New features have corresponding tests
- [ ] Edge cases are covered (empty state, error state, boundary values)
- [ ] Tests actually assert on behavior, not just existence

### Architecture

- [ ] Backend routes are thin; business logic is in services
- [ ] Frontend components are pure when possible
- [ ] No cross-package imports (frontend → backend or vice versa)

### Design System

- [ ] Uses Tailwind utility classes, not inline styles
- [ ] Uses `cn()` for conditional class merging
- [ ] Follows color token naming (`bg-card`, `text-foreground`, etc.)
- [ ] Responsive on mobile and desktop

### Security

- [ ] No secrets in code
- [ ] Input validation on all API endpoints (Zod)
- [ ] Auth middleware on protected routes
- [ ] Passwords hashed with bcrypt

### Performance

- [ ] No N+1 queries (use Prisma `include`)
- [ ] No unnecessary re-renders in React
- [ ] Images have appropriate sizing

## Review Comment Format

```
**[Category]**: Brief description

Why: One-sentence rationale

Suggestion: Concrete code or command to fix
```

Categories: `[Type Safety]`, `[Testing]`, `[Architecture]`, `[Design]`, `[Security]`, `[Performance]`
