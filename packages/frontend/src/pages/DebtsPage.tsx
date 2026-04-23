import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getDebts, type Debt, type PaymentResult } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentDialog from "@/components/PaymentDialog";
import CelebrationDialog, { isDebtCelebrated } from "@/components/CelebrationDialog";
import {
  CreditCard,
  DollarSign,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Skeleton ───────────────────────────────────────────────

function DebtRowSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Debt Row ───────────────────────────────────────────────

interface DebtRowProps {
  debt: Debt;
  onClick: () => void;
  onPaymentClick: (debt: Debt) => void;
}

function DebtRow({ debt, onClick, onPaymentClick }: DebtRowProps) {
  const original = debt.originalAmount ?? 0;
  const remaining = debt.remainingAmount ?? 0;
  const paid = original - remaining;
  const percentage = original > 0 ? Math.round((paid / original) * 100) : 0;

  return (
    <Card
      className="transition-all hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View details for ${debt.name}`}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Debt info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold truncate">{debt.name}</h3>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                  percentage >= 100
                    ? "bg-green-500/10 text-green-400"
                    : "bg-primary/10 text-primary"
                )}
              >
                {percentage}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{debt.creditor}</p>

            {/* Progress bar */}
            <div className="mt-3 space-y-1">
              <Progress value={percentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatCurrency(paid)} of {formatCurrency(original)}
                </span>
                <span>Remaining: {formatCurrency(remaining)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!debt.isPaidOff && (
              <Button
                size="sm"
                onClick={() => onPaymentClick(debt)}
                className="min-w-[120px]"
              >
                <DollarSign className="mr-1.5 h-4 w-4" />
                Log Payment
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="text-center p-8 md:p-12">
      <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
        <Wallet className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No active debts</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        You don&apos;t have any active debts yet. Start tracking your financial journey by adding your first debt.
      </p>
      <Button disabled>
        <CreditCard className="mr-2 h-4 w-4" />
        Add Your First Debt
      </Button>
    </Card>
  );
}

// ─── Main Debts Page ────────────────────────────────────────

export default function DebtsPage() {
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment dialog state
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Celebration dialog state
  const [celebrationDebt, setCelebrationDebt] = useState<Debt | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);

  const loadDebts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getDebts();
      setDebts(data);
    } catch {
      setError("Failed to load debts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const handleNavigateToDetail = useCallback(
    (debtId: string) => {
      navigate(`/debts/${debtId}`);
    },
    [navigate]
  );

  const handlePaymentClick = useCallback((debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentDialogOpen(true);
  }, []);

  const handlePaymentCreated = useCallback(
    (result: PaymentResult) => {
      // Refresh debts to show updated balances
      loadDebts();

      // Show celebration if debt was paid off and not yet celebrated
      if (result.debt.isPaidOff && !isDebtCelebrated(result.debt.id)) {
        setCelebrationDebt(result.debt);
        setCelebrationOpen(true);
      }
    },
    [loadDebts]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Debts</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <DebtRowSkeleton />
          <DebtRowSkeleton />
          <DebtRowSkeleton />
        </div>
      ) : debts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => (
            <DebtRow
              key={debt.id}
              debt={debt}
              onClick={() => handleNavigateToDetail(debt.id)}
              onPaymentClick={handlePaymentClick}
            />
          ))}
        </div>
      )}

      {/* Payment Dialog */}
      {selectedDebt && (
        <PaymentDialog
          debtId={selectedDebt.id}
          debtName={selectedDebt.name}
          creditor={selectedDebt.creditor}
          remainingAmount={selectedDebt.remainingAmount ?? 0}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onPaymentCreated={handlePaymentCreated}
        />
      )}

      {/* Celebration Dialog */}
      {celebrationDebt && (
        <CelebrationDialog
          debtId={celebrationDebt.id}
          debtName={celebrationDebt.name}
          creditor={celebrationDebt.creditor}
          open={celebrationOpen}
          onOpenChange={setCelebrationOpen}
        />
      )}
    </div>
  );
}
