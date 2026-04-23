# Code Review Skill

## Purpose

Perform structured code reviews that catch bugs, enforce architecture rules, and maintain quality standards.

## When to Use

- Before merging any PR
- After completing a feature implementation
- When reviewing another agent's or human's code

## Checklist

1. **Correctness**: Does the code do what it claims? Are edge cases handled?
2. **Type Safety**: Any `any` types? Non-null assertions without guards?
3. **Architecture**: Does it follow layer rules from ARCHITECTURE.md?
4. **Design**: Does it follow tokens from DESIGN.md?
5. **Tests**: Are there tests? Do they cover the changed behavior?
6. **Performance**: Any N+1 queries? Unnecessary re-renders?
7. **Security**: SQL injection? XSS? Auth bypass?

## Review Output Format

```markdown
## Summary
- {n} issues found, {m} blocking

## Blocking
1. {file}:{line} — {issue}
   FIX: {exact fix instruction}

## Non-blocking
1. {file}:{line} — {suggestion}

## Approved / Changes Requested
```

## Rules

- Always reference ARCHITECTURE.md and DESIGN.md when applicable
- Every blocking issue must have a FIX instruction
- Prefer concrete suggestions over vague feedback
