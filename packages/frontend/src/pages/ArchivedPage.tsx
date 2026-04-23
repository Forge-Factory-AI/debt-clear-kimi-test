import { useState, useEffect, useCallback } from "react";
import { getArchivedDebts, restoreDebt, type Debt } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive, RotateCcw } from "lucide-react";
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

function ArchivedDebtSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-28 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

// ─── Archived Debt Card ─────────────────────────────────────

interface ArchivedDebtCardProps {
  debt: Debt;
  onRestore: (debt: Debt) => void;
  isRestoring: boolean;
}

function ArchivedDebtCard({ debt, onRestore, isRestoring }: ArchivedDebtCardProps) {
  const original = debt.originalAmount ?? 0;
  const remaining = debt.remainingAmount ?? 0;
  const paid = original - remaining;
  const percentage = original > 0 ? Math.round((paid / original) * 100) : 0;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{debt.name}</CardTitle>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              percentage >= 100
                ? "bg-green-500/10 text-green-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {percentage}%
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{debt.creditor}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {formatCurrency(paid)} of {formatCurrency(original)}
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Remaining: {formatCurrency(remaining)}</span>
          {debt.dueDate && (
            <span>Due: {new Date(debt.dueDate).toLocaleDateString()}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => onRestore(debt)}
          disabled={isRestoring}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          {isRestoring ? "Restoring..." : "Restore"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="text-center p-8 md:p-12">
      <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
        <Archive className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No archived debts</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        You don&apos;t have any archived debts. Archived debts will appear here when you archive them from the dashboard.
      </p>
    </Card>
  );
}

// ─── Main Archived Page ─────────────────────────────────────

export default function ArchivedPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadArchivedDebts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getArchivedDebts();
      setDebts(data);
    } catch {
      setError("Failed to load archived debts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchivedDebts();
  }, [loadArchivedDebts]);

  async function handleRestore(debt: Debt) {
    setRestoringId(debt.id);
    try {
      await restoreDebt(debt.id);
      toast("Debt restored successfully", "success");
      // Remove restored debt from the list
      setDebts((prev) => prev.filter((d) => d.id !== debt.id));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to restore debt", "error");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Archived Debts</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ArchivedDebtSkeleton />
          <ArchivedDebtSkeleton />
          <ArchivedDebtSkeleton />
        </div>
      ) : debts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {debts.map((debt) => (
            <ArchivedDebtCard
              key={debt.id}
              debt={debt}
              onRestore={handleRestore}
              isRestoring={restoringId === debt.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
