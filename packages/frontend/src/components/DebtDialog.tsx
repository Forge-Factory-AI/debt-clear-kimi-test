import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, Plus, Pencil } from "lucide-react";
import type { Debt } from "@/lib/api";

export interface DebtFormData {
  name: string;
  creditor: string;
  originalAmount: string;
  remainingAmount: string;
  interestRate: string;
  dueDate: string;
}

function emptyForm(): DebtFormData {
  return {
    name: "",
    creditor: "",
    originalAmount: "",
    remainingAmount: "",
    interestRate: "",
    dueDate: "",
  };
}

function debtToForm(debt: Debt): DebtFormData {
  return {
    name: debt.name,
    creditor: debt.creditor,
    originalAmount: debt.originalAmount?.toString() ?? "",
    remainingAmount: debt.remainingAmount?.toString() ?? "",
    interestRate: debt.interestRate?.toString() ?? "",
    dueDate: debt.dueDate
      ? new Date(debt.dueDate).toISOString().split("T")[0]
      : "",
  };
}

interface FieldErrors {
  name?: string;
  creditor?: string;
  originalAmount?: string;
  remainingAmount?: string;
  interestRate?: string;
  dueDate?: string;
}

function validateField(
  name: keyof DebtFormData,
  value: string
): string | undefined {
  switch (name) {
    case "name":
      if (!value.trim()) return "Name is required";
      if (value.trim().length > 100) return "Name must be 100 characters or less";
      return undefined;
    case "creditor":
      if (!value.trim()) return "Creditor is required";
      if (value.trim().length > 100) return "Creditor must be 100 characters or less";
      return undefined;
    case "originalAmount": {
      if (!value.trim()) return "Original amount is required";
      const num = Number(value);
      if (Number.isNaN(num) || num <= 0) return "Must be a positive number";
      return undefined;
    }
    case "remainingAmount": {
      if (!value.trim()) return undefined;
      const num = Number(value);
      if (Number.isNaN(num) || num < 0) return "Must be a non-negative number";
      return undefined;
    }
    case "interestRate": {
      if (!value.trim()) return undefined;
      const num = Number(value);
      if (Number.isNaN(num) || num < 0) return "Must be a non-negative number";
      return undefined;
    }
    case "dueDate": {
      if (!value.trim()) return undefined;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "Must be a valid date";
      return undefined;
    }
    default:
      return undefined;
  }
}

function validateAll(form: DebtFormData): FieldErrors {
  const errors: FieldErrors = {};
  (Object.keys(form) as Array<keyof DebtFormData>).forEach((key) => {
    const err = validateField(key, form[key]);
    if (err) errors[key] = err;
  });
  return errors;
}

interface DebtDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DebtFormData) => void | Promise<void>;
  debt?: Debt | null;
  isLoading?: boolean;
}

export default function DebtDialog({
  open,
  onClose,
  onSubmit,
  debt,
  isLoading = false,
}: DebtDialogProps) {
  const isEdit = !!debt;
  const [form, setForm] = useState<DebtFormData>(emptyForm());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<keyof DebtFormData, boolean>>({
    name: false,
    creditor: false,
    originalAmount: false,
    remainingAmount: false,
    interestRate: false,
    dueDate: false,
  });

  // Initialize form when dialog opens or debt changes
  useEffect(() => {
    if (open) {
      setForm(isEdit && debt ? debtToForm(debt) : emptyForm());
      setErrors({});
      setTouched({
        name: false,
        creditor: false,
        originalAmount: false,
        remainingAmount: false,
        interestRate: false,
        dueDate: false,
      });
    }
  }, [open, debt, isEdit]);

  const handleChange = useCallback(
    (field: keyof DebtFormData, value: string) => {
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        // When originalAmount changes in add mode and remainingAmount is empty,
        // default remainingAmount to match originalAmount
        if (field === "originalAmount" && !isEdit && !prev.remainingAmount.trim()) {
          next.remainingAmount = value;
        }
        return next;
      });
      if (touched[field]) {
        setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
      }
    },
    [touched, isEdit]
  );

  const handleBlur = useCallback(
    (field: keyof DebtFormData) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }));
    },
    [form]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const allErrors = validateAll(form);
      setErrors(allErrors);
      setTouched({
        name: true,
        creditor: true,
        originalAmount: true,
        remainingAmount: true,
        interestRate: true,
        dueDate: true,
      });

      if (Object.keys(allErrors).length > 0) return;
      await onSubmit(form);
    },
    [form, onSubmit]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 md:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="debt-dialog-title"
    >
      <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle id="debt-dialog-title" className="text-lg font-semibold flex items-center gap-2">
            {isEdit ? (
              <>
                <Pencil className="h-5 w-5 text-primary" aria-hidden="true" />
                Edit Debt
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
                Add New Debt
              </>
            )}
          </CardTitle>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="debt-name">Debt Name</Label>
              <Input
                id="debt-name"
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="e.g. Car Loan"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "debt-name-error" : undefined}
              />
              {errors.name && (
                <p id="debt-name-error" className="text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="debt-creditor">Creditor</Label>
              <Input
                id="debt-creditor"
                type="text"
                value={form.creditor}
                onChange={(e) => handleChange("creditor", e.target.value)}
                onBlur={() => handleBlur("creditor")}
                placeholder="e.g. Bank of America"
                aria-invalid={!!errors.creditor}
                aria-describedby={errors.creditor ? "debt-creditor-error" : undefined}
              />
              {errors.creditor && (
                <p id="debt-creditor-error" className="text-xs text-destructive">
                  {errors.creditor}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="debt-original">Original Amount</Label>
                <Input
                  id="debt-original"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.originalAmount}
                  onChange={(e) => handleChange("originalAmount", e.target.value)}
                  onBlur={() => handleBlur("originalAmount")}
                  placeholder="0.00"
                  aria-invalid={!!errors.originalAmount}
                  aria-describedby={errors.originalAmount ? "debt-original-error" : undefined}
                />
                {errors.originalAmount && (
                  <p id="debt-original-error" className="text-xs text-destructive">
                    {errors.originalAmount}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="debt-remaining">
                  Current Balance
                  <span className="text-muted-foreground font-normal"> (optional)</span>
                </Label>
                <Input
                  id="debt-remaining"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.remainingAmount}
                  onChange={(e) => handleChange("remainingAmount", e.target.value)}
                  onBlur={() => handleBlur("remainingAmount")}
                  placeholder="0.00"
                  aria-invalid={!!errors.remainingAmount}
                  aria-describedby={errors.remainingAmount ? "debt-remaining-error" : undefined}
                />
                {errors.remainingAmount && (
                  <p id="debt-remaining-error" className="text-xs text-destructive">
                    {errors.remainingAmount}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="debt-rate">
                  Interest Rate (%)
                  <span className="text-muted-foreground font-normal"> (optional)</span>
                </Label>
                <Input
                  id="debt-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.interestRate}
                  onChange={(e) => handleChange("interestRate", e.target.value)}
                  onBlur={() => handleBlur("interestRate")}
                  placeholder="0.00"
                  aria-invalid={!!errors.interestRate}
                  aria-describedby={errors.interestRate ? "debt-rate-error" : undefined}
                />
                {errors.interestRate && (
                  <p id="debt-rate-error" className="text-xs text-destructive">
                    {errors.interestRate}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="debt-due">
                  Due Date
                  <span className="text-muted-foreground font-normal"> (optional)</span>
                </Label>
                <Input
                  id="debt-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => handleChange("dueDate", e.target.value)}
                  onBlur={() => handleBlur("dueDate")}
                  aria-invalid={!!errors.dueDate}
                  aria-describedby={errors.dueDate ? "debt-due-error" : undefined}
                />
                {errors.dueDate && (
                  <p id="debt-due-error" className="text-xs text-destructive">
                    {errors.dueDate}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Add Debt"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
