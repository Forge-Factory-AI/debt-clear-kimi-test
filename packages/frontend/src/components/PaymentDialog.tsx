import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPayment, type PaymentResult } from "@/lib/api";
import { DollarSign, Loader2 } from "lucide-react";

interface PaymentDialogProps {
  debtId: string;
  debtName: string;
  creditor: string;
  remainingAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentCreated: (result: PaymentResult) => void;
}

export default function PaymentDialog({
  debtId,
  debtName,
  creditor,
  remainingAmount,
  open,
  onOpenChange,
  onPaymentCreated,
}: PaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = useCallback(() => {
    setAmount("");
    setNote("");
    setError("");
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    if (note.trim().length > 255) {
      setError("Note must be 255 characters or less");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPayment(
        debtId,
        numAmount,
        note.trim() || undefined
      );
      onPaymentCreated(result);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const noteLength = note.trim().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Payment</DialogTitle>
          <DialogDescription>
            Make a payment toward <strong>{debtName}</strong> from{" "}
            <strong>{creditor}</strong>. Remaining balance:{" "}
            <strong>
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(remainingAmount)}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-note">
              Note{" "}
              <span
                className={
                  noteLength > 255 ? "text-destructive" : "text-muted-foreground"
                }
              >
                ({noteLength}/255)
              </span>
            </Label>
            <Input
              id="payment-note"
              type="text"
              placeholder="Optional note (e.g., 'March payment')"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Log Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
