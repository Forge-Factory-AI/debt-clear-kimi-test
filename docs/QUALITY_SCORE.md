# DebtClear Quality Score

## Grading Table

| Dimension | Weight | A (90-100) | B (70-89) | C (50-69) | D (0-49) |
|-----------|--------|------------|-----------|-----------|----------|
| **Correctness** | 25% | All tests pass; no runtime errors | Minor edge-case bugs | Obvious bugs in core flows | Broken core features |
| **Type Safety** | 20% | Zero `any`; strict TS config | Occasional `any` or non-null assertions | Frequent `any` or missing types | Major type holes |
| **Test Coverage** | 20% | >80% unit + integration | 60-80% coverage | <60% coverage | No tests |
| **Design Fidelity** | 15% | Matches design tokens exactly | Minor deviations | Major visual inconsistencies | Does not follow design system |
| **Code Clarity** | 10% | Self-documenting, no comments needed | Clear with occasional comments | Needs comments to understand | Incomprehensible |
| **Performance** | 10% | No unnecessary re-renders or queries | Minor optimization opportunities | Noticeable lag | Unusable performance |

## Score Calculation

Total = sum(dimension_score * weight)

| Total | Grade |
|-------|-------|
| >= 90 | A |
| >= 70 | B |
| >= 50 | C |
| < 50 | D |

## Minimum Acceptable Scores

| Context | Minimum |
|---------|---------|
| Production PR | B (70) |
| Bug fix | B (70) |
| New feature | B (70) |
| Documentation only | No score required |
| Architecture tests | Must pass (100) |

## Automated Checks

- `pnpm test` must pass (includes unit, integration, and architecture tests)
- `pnpm build` must pass with zero TypeScript errors
- `pnpm lint` must pass
- CI workflow (`.github/workflows/ci.yml`) enforces all of the above

## Manual Review Checklist

- [ ] UI matches design tokens (colors, spacing, typography)
- [ ] Responsive at `sm`, `md`, `lg` breakpoints
- [ ] Error states handled gracefully
- [ ] Loading states present where needed
- [ ] Accessibility: keyboard navigation, focus states, ARIA labels
- [ ] No console errors in dev mode
- [ ] Dark mode only (no light mode regressions)
