# Frontend Design Skill

## Purpose

Ensure all UI changes match the dark fintech design system and achieve a minimum quality score of 7.0.

## When to Use

- Building any new UI page or component
- Modifying existing components
- Reviewing frontend PRs

## Quality Criteria

| Criterion | Weight | Check |
|-----------|--------|-------|
| Color tokens | 20% | Uses `hsl(var(--token))` from DESIGN.md, no hardcoded hex |
| Typography | 15% | Uses Tailwind typography classes, Inter font |
| Spacing | 15% | Consistent padding/margins, uses design tokens |
| Responsiveness | 15% | Works at `sm`, `md`, `lg` breakpoints |
| Accessibility | 15% | Focus states, keyboard nav, ARIA labels, color contrast |
| Animation | 10% | Smooth transitions, confetti on payoff, no jank |
| Polish | 10% | No layout shifts, proper loading/error states |

Minimum score: 7.0 / 10.0

## Component Patterns

- Always use `cn()` from `@/lib/utils` for conditional classes
- shadcn/ui components go in `src/components/ui/`
- Feature components go in `src/components/` or `src/features/`
- Pages go in `src/pages/` (create if missing)

## Rules

- Dark mode only; do not add a light mode toggle
- Use existing shadcn/ui primitives before building custom
- All interactive elements must have hover/focus states
- Progress bars use primary color; paid-off state uses green accent
