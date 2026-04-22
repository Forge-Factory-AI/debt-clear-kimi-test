# Quality Score

## Grading Table

| Dimension | Weight | A (10) | B (8) | C (6) | D (4) | F (0) |
|-----------|--------|--------|-------|-------|-------|-------|
| **Type Safety** | 20% | Zero `any` except external types; strict TS throughout | Occasional `any` for complex generics | Some `any` in new code | Widespread `any` or `ts-ignore` | Types disabled or ignored |
| **Test Coverage** | 20% | >80% unit + integration | >60% coverage, key paths tested | Smoke tests pass, gaps in edge cases | Only happy-path tests | No tests or all failing |
| **Accessibility** | 15% | Keyboard-navigable, ARIA labels, color-contrast WCAG AA | Basic labels, mostly navigable | Some labels missing | Keyboard traps, no labels | Completely inaccessible |
| **Performance** | 15% | Lighthouse >90, no unnecessary re-renders | Lighthouse >75, minimal issues | Acceptable load times | Noticeable lag | Unusable performance |
| **Code Clarity** | 15% | Self-documenting, clear naming, no dead code | Minor naming issues | Some unclear sections | Frequent confusion needed | Unreadable without author |
| **Design Consistency** | 15% | Uses design tokens, matches mocks, consistent spacing | Minor deviations | Inconsistent patterns | Frequent one-offs | No design system followed |

## Scoring

```
Score = Σ(dimension_score × weight)
```

| Range | Grade |
|-------|-------|
| 9.0 – 10.0 | A+ |
| 8.0 – 8.9 | A |
| 7.0 – 7.9 | B+ |
| 6.0 – 6.9 | B |
| 5.0 – 5.9 | C+ |
| 4.0 – 4.9 | C |
| < 4.0 | F |

## Minimum Acceptable

**B+ (7.0)** required for merge. All PRs must:

1. Pass `pnpm test` with no failures
2. Pass `pnpm lint` with no errors
3. Have no TypeScript errors (`tsc --noEmit`)
4. Maintain or improve existing test coverage
