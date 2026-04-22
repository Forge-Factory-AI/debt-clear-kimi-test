# Frontend Design

## When to Use

Use this skill when building any UI page, component, or interaction. The minimum acceptable design quality score is 7.0 (B+).

## Design Principles

1. **Dark first.** The app is dark-mode only. Use the `.dark` CSS variables.
2. **Fintech aesthetic.** Clean, data-dense, trustworthy. Avoid playful animations except for the paid-off confetti.
3. **Mobile-first.** Design for 375px width, scale up to 1440px.
4. **Consistent spacing.** Use Tailwind's spacing scale, not arbitrary values.

## Component Quality Criteria

### Layout

- [ ] Uses container queries or responsive breakpoints
- [ ] Content is readable at all widths
- [ ] Touch targets are ≥ 44px

### Visual

- [ ] Colors use CSS variables (`bg-background`, `text-foreground`)
- [ ] No hardcoded hex colors
- [ ] Border radius follows tokens (`rounded-lg` for cards, `rounded-md` for buttons)
- [ ] Shadows are subtle (`shadow-sm` or `shadow`)

### Typography

- [ ] Font family is Inter
- [ ] Hierarchy is clear (H1 > H2 > H3 > body > caption)
- [ ] Line height is comfortable (`leading-relaxed` for body)

### Interactions

- [ ] Hover states on all interactive elements
- [ ] Focus rings visible (`ring-2 ring-ring`)
- [ ] Loading states for async actions
- [ ] Error states with clear messages

### Accessibility

- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast ≥ 4.5:1
- [ ] Keyboard navigable
- [ ] Form inputs have associated labels

## shadcn/ui Patterns

When adding a shadcn component:

1. Install via CLI: `npx shadcn add [component]`
2. Customize in the component file to match design tokens
3. Export from `components/ui/index.ts` if creating a barrel file

## Custom Component Template

```tsx
interface MyComponentProps {
  label: string;
  value: string;
  onAction: () => void;
}

export function MyComponent({ label, value, onAction }: MyComponentProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-medium text-card-foreground">{label}</h3>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <button
        onClick={onAction}
        className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
      >
        Action
      </button>
    </div>
  );
}
```
