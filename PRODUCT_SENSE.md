# Product Sense

## Elevator Pitch

DebtClear helps users track, manage, and pay off their debts with a focused, dark-themed fintech interface. No bank integrations, no interest math — just clear progress, payment history, and the satisfaction of watching debts disappear.

## Target User

Individuals with 2–10 active debts (credit cards, loans, medical bills) who want a simple, visual way to track balances and payments without spreadsheet complexity.

## Core User Journeys

### 1. Onboarding

1. User lands on the app
2. Registers with email + password
3. Sees empty state with a friendly prompt to add their first debt

### 2. Add a Debt

1. User clicks "Add Debt"
2. Fills in name, total amount, category (optional), due date (optional)
3. Debt appears on the dashboard with a progress bar at 0%

### 3. Log a Payment

1. User opens a debt card
2. Clicks "Log Payment"
3. Enters amount + optional note
4. Progress bar updates; if remaining reaches 0, confetti triggers

### 4. View Payment History

1. User opens a debt
2. Sees chronological list of all payments
3. Can delete a payment (with confirmation)

### 5. Archive a Paid-Off Debt

1. Debt reaches $0 remaining
2. User can archive it (moves to achievements page)
3. Archive page shows all paid-off debts as badges/trophies

### 6. Dashboard Overview

1. User sees total debt, total paid, number of active debts
2. Each debt shows name, remaining amount, progress bar
3. Visual distinction between active and paid-off debts

## Feature Priority

| Priority | Feature |
|----------|---------|
| P0 | Registration, login, logout |
| P0 | Add, edit, delete debt |
| P0 | Log payment, view history |
| P0 | Protected routes |
| P0 | Dashboard statistics |
| P0 | Per-debt progress bar |
| P0 | Dark fintech UI |
| P0 | Responsive layout |
| P1 | Archive / restore debt |
| P1 | Paid-off achievements page |
| P1 | Paid-off confetti |
| P1 | Empty state for new users |
| P1 | Delete payment |

## Non-Goals

- Interest accrual calculations
- Bank integrations / automatic import
- Payment reminders / notifications
- Payoff strategy recommendations (avalanche vs snowball)
- Multi-currency support
- Social features (sharing, leaderboards)
- OAuth / social login
- Data export
- Native mobile apps
- Admin panel
- Password reset flow
- Payment editing (delete + re-add only)
- Light mode

## Navigation Structure

```
/                   Dashboard (authenticated)
/login              Login page
/register           Registration page
/debts/:id          Debt detail + payment history
/achievements       Paid-off debts archive
```
