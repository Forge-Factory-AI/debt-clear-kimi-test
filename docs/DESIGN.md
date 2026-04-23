# DebtClear Design System

## Color Tokens

All colors are defined as HSL CSS custom properties in `packages/frontend/src/index.css`.

### Dark Mode (Default)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--background` | `224 71% 4%` | Page background |
| `--foreground` | `213 31% 91%` | Primary text |
| `--card` | `224 71% 4%` | Card surfaces |
| `--card-foreground` | `213 31% 91%` | Card text |
| `--popover` | `224 71% 4%` | Popover/dropdown surfaces |
| `--popover-foreground` | `213 31% 91%` | Popover text |
| `--primary` | `210 40% 98%` | Primary action/buttons |
| `--primary-foreground` | `222.2 47.4% 11.2%` | Text on primary |
| `--secondary` | `222.2 47.4% 11.2%` | Secondary surfaces |
| `--secondary-foreground` | `210 40% 98%` | Text on secondary |
| `--muted` | `223 47% 11%` | Muted/disabled backgrounds |
| `--muted-foreground` | `215.4 16.3% 56.9%` | Muted text, placeholders |
| `--accent` | `216 34% 17%` | Accent/hover states |
| `--accent-foreground` | `210 40% 98%` | Text on accent |
| `--destructive` | `0 62.8% 30.6%` | Error/delete actions |
| `--destructive-foreground` | `210 40% 98%` | Text on destructive |
| `--border` | `216 34% 17%` | Borders, dividers |
| `--input` | `216 34% 17%` | Form input borders |
| `--ring` | `216 34% 17%` | Focus rings |

### Light Mode (Defined but unused)

Light mode tokens exist in `:root` but the app runs `dark` by default. Do not add a toggle.

## Typography

| Element | Spec |
|---------|------|
| Font Family | `Inter`, `system-ui`, `sans-serif` |
| Base Size | Browser default (16px) |
| Heading 1 | `text-4xl font-bold tracking-tight` |
| Body | Default + `text-muted-foreground` for secondary |
| Button | `text-sm font-medium` |

Font feature settings: `"rlig" 1, "calt" 1`

## Spacing & Radii

| Token | Value |
|-------|-------|
| `--radius` | `0.5rem` |
| `lg` | `0.5rem` |
| `md` | `0.375rem` |
| `sm` | `0.25rem` |

## Animation Specs

| Animation | Duration | Easing |
|-----------|----------|--------|
| Button hover | `transition-colors` | Default CSS ease |
| Focus ring | `ring-2 ring-offset-2` | Instant |
| Page transitions | TBD | `ease-in-out` |
| Confetti (payoff) | 3-5s | Physics-based (canvas-confetti) |

## Component Patterns

### Button Variants

| Variant | Style |
|---------|-------|
| `default` | `bg-primary text-primary-foreground` |
| `destructive` | `bg-destructive text-destructive-foreground` |
| `outline` | `border bg-background hover:bg-accent` |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `ghost` | `hover:bg-accent` |
| `link` | `underline-offset-4 hover:underline` |

### Size Variants

| Size | Padding |
|------|---------|
| `default` | `h-10 px-4 py-2` |
| `sm` | `h-9 px-3` |
| `lg` | `h-11 px-8` |
| `icon` | `h-10 w-10` |

## Layout

- Minimum height: `min-h-screen`
- Content centered: `flex items-center justify-center`
- Max content width: Container component (TBD)
- Responsive: Tailwind breakpoints (`sm`, `md`, `lg`, `xl`)
