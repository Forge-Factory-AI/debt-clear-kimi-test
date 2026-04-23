# Harness Engineering Skill

## Purpose

Generate and maintain agent-legible scaffolding: documentation, architecture tests, and quality gates that make the repo self-describing to AI agents.

## When to Use

- Creating or updating AGENTS.md, docs/, architecture tests, or QUALITY_SCORE.md
- Setting up a new repo for agent-assisted development
- Reviewing whether the repo remains agent-legible after changes

## Outputs

1. **AGENTS.md** at repo root: Project overview, stack, structure, commands, rules, pitfalls
2. **docs/ARCHITECTURE.md**: Layer rules, module inventory, dependency flow
3. **docs/DESIGN.md**: Color tokens, typography, animation specs, component patterns
4. **docs/PRODUCT_SENSE.md**: User journeys, in-scope features, non-goals
5. **docs/QUALITY_SCORE.md**: Grading table, minimum scores, automated checks
6. **test/architecture/**: Structural tests that verify layer rules and file conventions
7. **skills/**: Skill definitions for other agent workflows

## Rules

- All documentation must reflect the actual codebase, not aspirational architecture
- Architecture tests must include FIX instructions in assertion messages
- Tests must pass on the current codebase (no false positives)
- Use Vitest for architecture tests (same test runner as the project)
- Keep AGENTS.md under 120 lines; link to docs/ for details
