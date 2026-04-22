# Design System

## Theme

Dark fintech UI. The application uses a CSS-class-based dark mode (`class="dark"`) applied to the root `<html>` element.

## Color Tokens

### Dark Mode (Primary)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--background` | `222 47% 6%` | Page background |
| `--foreground` | `210 40% 98%` | Primary text |
| `--card` | `222 47% 8%` | Card surfaces |
| `--card-foreground` | `210 40% 98%` | Text on cards |
| `--popover` | `222 47% 8%` | Dropdown/popover surfaces |
| `--primary` | `210 40% 98%` | Buttons, links, emphasis |
| `--secondary` | `217.2 32.6% 17.5%` | Secondary buttons, tags |
| `--muted` | `217.2 32.6% 17.5%` | Disabled, subtle backgrounds |
| `--muted-foreground` | `215 20.2% 65.1%` | Placeholder, secondary text |
| `--accent` | `217.2 32.6% 17.5%` | Highlights, focus rings |
| `--destructive` | `0 62.8% 30.6%` | Delete, errors |
| `--border` | `217.2 32.6% 17.5%` | Dividers, outlines |
| `--input` | `217.2 32.6% 17.5%` | Form field backgrounds |
| `--ring` | `212.7 26.8% 83.9%` | Focus indicator |

### Semantic Colors

| Purpose | Token |
|---------|-------|
| Success / Paid off | `emerald-500` (`#10b981`) |
| Debt remaining | `rose-500` (`#f43f5e`) |
| Progress fill | `sky-500` (`#0ea5e9`) |

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 (page title) | Inter | `text-4xl` | `font-bold` |
| H2 (section) | Inter | `text-2xl` | `font-semibold` |
| H3 (card title) | Inter | `text-lg` | `font-medium` |
| Body | Inter | `text-base` | `font-normal` |
| Caption / Label | Inter | `text-sm` | `font-medium` |

## Spacing Scale

Uses Tailwind defaults. Common patterns:

| Context | Gap / Padding |
|---------|--------------|
| Page padding | `px-4 py-6` (mobile), `px-8 py-10` (desktop) |
| Card padding | `p-6` |
| Card gap | `gap-4` |
| Section gap | `space-y-6` |

## Border Radius

| Token | Value |
|-------|-------|
| `--radius` | `0.5rem` |
| Card | `rounded-lg` |
| Button | `rounded-md` |
| Input | `rounded-md` |
| Avatar | `rounded-full` |

## Animation Specs

| Animation | Duration | Easing |
|-----------|----------|--------|
| Page transition | `300ms` | `ease-in-out` |
| Modal/dialog | `200ms` | `ease-out` |
| Accordion | `200ms` | `ease-out` |
| Toast | `150ms` | `ease-out` |
| Progress bar fill | `500ms` | `ease-out` |
| Confetti (paid off) | `3000ms` | physics-based |

## Component Patterns

### Card

```
bg-card rounded-lg border border-border p-6 shadow-sm
```

### Button (Primary)

```
bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2
```

### Input

```
bg-input border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground
```

### Progress Bar

```
h-2 bg-muted rounded-full overflow-hidden
inner: h-full bg-sky-500 transition-all duration-500
```
