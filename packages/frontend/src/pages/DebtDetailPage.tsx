import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDebtWithPayments, deletePayment, type Debt, type Payment } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Percent,
  Wallet,
  Trash2,
  Clock,
  Landmark,
  FileText,
  Receipt,
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

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Skeleton Components ────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Payment Item ───────────────────────────────────────────

interface PaymentItemProps {
  payment: Payment;
  onDelete: (payment: Payment) => void;
}

function PaymentItem({ payment, onDelete }: PaymentItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Receipt className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
          {payment.note && (
            <p className="text-xs text-muted-foreground truncate">{payment.note}</p>
          )}
          <p className="text-xs text-muted-foreground">{formatDate(payment.paidAt)}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(payment)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete payment of ${formatCurrency(payment.amount)}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Payment Empty State ────────────────────────────────────

function PaymentEmptyState() {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-3">
        <Wallet className="h-5 w-5 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium mb-1">No payments yet</h4>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        This debt has no recorded payments. Log a payment to start tracking progress.
      </p>
    </div>
  );
}

// ─── Main Detail Page ───────────────────────────────────────

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Delete confirmation dialog state
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDebt = useCallback(async () => {
    if (!id) {
      setError("Invalid debt ID");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await getDebtWithPayments(id);
      setDebt(data);
      setPayments(data.payments ?? []);
    } catch {
      setError("Failed to load debt details");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDebt();
  }, [loadDebt]);

  function handleBack() {
    navigate(-1);
  }

  function handleDeleteClick(payment: Payment) {
    setDeletingPayment(payment);
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingPayment) return;
    setIsDeleting(true);
    try {
      await deletePayment(deletingPayment.id);
      toast("Payment deleted successfully", "success");
      setDeleteDialogOpen(false);
      setDeletingPayment(null);
      await loadDebt();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete payment", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleCancelDelete() {
    setDeleteDialogOpen(false);
    setDeletingPayment(null);
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !debt) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || "Debt not found"}
        </div>
      </div>
    );
  }

  const original = debt.originalAmount ?? 0;
  const remaining = debt.remainingAmount ?? 0;
  const paid = original - remaining;
  const percentage = original > 0 ? Math.round((paid / original) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Debt Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">{debt.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{debt.creditor}</p>
            </div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full shrink-0",
                percentage >= 100
                  ? "bg-green-500/10 text-green-400"
                  : "bg-primary/10 text-primary"
              )}
            >
              {percentage >= 100 ? "Paid Off" : `${percentage}% Paid`}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Original Amount</p>
                <p className="text-sm font-medium">{formatCurrency(original)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-sm font-medium">{formatCurrency(remaining)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                <Landmark className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid So Far</p>
                <p className="text-sm font-medium">{formatCurrency(paid)}</p>
              </div>
            </div>
            {debt.interestRate !== null && debt.interestRate !== undefined && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Interest Rate</p>
                  <p className="text-sm font-medium">{debt.interestRate}%</p>
                </div>
              </div>
            )}
            {debt.dueDate && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium">{formatDate(debt.dueDate)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">{formatDate(debt.createdAt)}</p>
              </div>
            </div>
            {debt.isPaidOff && debt.paidOffAt && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <FileText className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid Off Date</p>
                  <p className="text-sm font-medium text-green-400">{formatDate(debt.paidOffAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{formatCurrency(paid)} of {formatCurrency(original)}</span>
            </div>
            <Progress value={percentage} className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      {/* Payment History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Payment History</CardTitle>
            <span className="text-xs text-muted-foreground">{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <PaymentEmptyState />
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <PaymentItem
                  key={payment.id}
                  payment={payment}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payment of{" "}
              <strong>{deletingPayment ? formatCurrency(deletingPayment.amount) : ""}</strong>?
              The debt balance will be restored.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
