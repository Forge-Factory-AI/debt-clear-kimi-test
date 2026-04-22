# Harness Engineering

## When to Use

Use this skill when generating or updating:
- `AGENTS.md`
- `ARCHITECTURE.md`
- `DESIGN.md`
- `PRODUCT_SENSE.md`
- `QUALITY_SCORE.md`
- `test/architecture/` tests
- Any `docs/` or `skills/` scaffolding

## Required Outputs

Every harness engineering task must produce:

1. **Agent-legible docs** — Written for an AI agent, not a human. Use imperative tone, concrete file paths, and explicit rules.
2. **Architecture tests** — Automated tests that verify structural constraints (layer rules, import boundaries, naming conventions).
3. **FIX instructions** — Every failing assertion must print the exact command or edit needed to fix it.

## Documentation Standards

### AGENTS.md

- 80–120 lines
- Project-specific (not generic boilerplate)
- Must include: quick start commands, monorepo layout, key conventions, API surface summary, agent directives

### ARCHITECTURE.md

- Layer rules with a dependency table
- Module inventory listing all significant directories/files
- Data flow diagram (ASCII or description)
- Explicit dependency boundaries

### DESIGN.md

- Color tokens table with HSL values and usage
- Typography scale (font, size, weight)
- Spacing patterns
- Border radius tokens
- Animation specs (duration + easing)
- Component pattern examples

### PRODUCT_SENSE.md

- Elevator pitch
- Target user description
- Core user journeys (numbered steps)
- Feature priority table
- Explicit non-goals list

### QUALITY_SCORE.md

- Grading table with dimensions, weights, and rubric
- Scoring formula
- Minimum acceptable grade for merge

## Architecture Test Standards

### Required Test Files

1. `layers.test.ts` — Layer dependency rules
2. `structure.test.ts` — Directory/module structure
3. `boundaries.test.ts` — Import boundaries
4. `naming.test.ts` — File naming conventions

### FIX Instruction Format

Every assertion must include a message with the `FIX:` prefix:

```typescript
expect(someCondition).toBe(true, "FIX: Run `pnpm db:generate` to create the Prisma client");
```

### Test Environment

- Use Vitest
- Run via `pnpm test` from root
- Must pass on current codebase

## Validation Checklist

- [ ] All 5 documentation files exist and have meaningful content
- [ ] All 3 skills directories have a SKILL.md
- [ ] All 4 architecture test files exist
- [ ] Every assertion includes a FIX instruction
- [ ] `pnpm test` passes including architecture tests
