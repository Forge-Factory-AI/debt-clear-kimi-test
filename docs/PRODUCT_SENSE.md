# DebtClear Product Sense

## User Personas

### Primary: Debt-Conscious Individual
- Wants to track multiple debts in one place
- Needs visual progress to stay motivated
- Celebrates milestones (paying off a debt)

## User Journeys

### 1. Registration & Onboarding
1. Landing page → Click "Get Started"
2. Register with email + password
3. See empty-state dashboard with guidance

### 2. Adding a Debt
1. Dashboard → Click "Add Debt"
2. Fill form: name, creditor, original amount, interest rate (optional), due date (optional)
3. Debt appears in list with progress bar at 0%

### 3. Logging a Payment
1. Dashboard → Click on a debt
2. Enter payment amount
3. Progress bar updates; if remaining = 0, confetti celebration triggers
4. Payment appears in history

### 4. Viewing Payment History
1. Dashboard → Click a debt → View "Payment History" tab
2. See chronological list of all payments with amounts and dates

### 5. Archiving a Paid-Off Debt
1. Dashboard → Click a paid-off debt
2. Click "Archive" button
3. Debt moves to "Archived" section
4. Can be restored later

### 6. Viewing Achievements
1. Navigation → Click "Achievements"
2. See grid of paid-off debts with payoff dates

## Core Features (In Scope)

- User registration, login, logout
- Protected routes (data is private)
- CRUD for debts
- Log payments against debts
- View payment history
- Delete a payment
- Dashboard summary (total debt, paid amount, remaining, count)
- Per-debt progress bar
- Confetti celebration on payoff
- Paid-off achievements page
- Archive / restore debts
- Dark fintech UI theme
- Responsive layout
- Empty state for new users

## Non-Goals (Out of Scope)

- Interest accrual calculations
- Bank integrations / automated imports
- Payment reminders / notifications
- Payoff strategy recommendations (snowball, avalanche)
- Multi-currency support
- Social features (sharing, leaderboards)
- OAuth (Google, GitHub login)
- Data export (CSV, PDF)
- Native mobile apps (iOS, Android)
- Admin panel
- Password reset / forgot password
- Payment editing (only add and delete)
- Light mode

## Design Principles

1. **Motivation through visibility**: Progress bars and statistics keep users engaged.
2. **Celebrate wins**: Confetti on payoff creates positive reinforcement.
3. **Dark and focused**: Dark fintech aesthetic reduces distraction.
4. **Simple and fast**: No complex financial calculations; just track and pay.
