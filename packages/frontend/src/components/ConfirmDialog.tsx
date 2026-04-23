import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, AlertTriangle, Archive } from "lucide-react";

export type ConfirmAction = "delete" | "archive";

interface ConfirmDialogProps {
  open: boolean;
  action: ConfirmAction;
  debtName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const config: Record<
  ConfirmAction,
  {
    title: string;
    message: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    confirmLabel: string;
    confirmVariant: "default" | "destructive";
  }
> = {
  delete: {
    title: "Delete Debt",
    message: "This action cannot be undone. This will permanently delete the debt and all associated payment history.",
    icon: AlertTriangle,
    iconColor: "text-destructive",
    confirmLabel: "Delete",
    confirmVariant: "destructive",
  },
  archive: {
    title: "Archive Debt",
    message: "This will remove the debt from your active dashboard. You can restore it later from the Archived page.",
    icon: Archive,
    iconColor: "text-yellow-400",
    confirmLabel: "Archive",
    confirmVariant: "default",
  },
};

export default function ConfirmDialog({
  open,
  action,
  debtName,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const { title, message, icon: Icon, iconColor, confirmLabel, confirmVariant } = config[action];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 md:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <Card className="w-full max-w-sm animate-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle id="confirm-dialog-title" className="text-lg font-semibold flex items-center gap-2">
            <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
            {title}
          </CardTitle>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to {action} <strong className="text-foreground">{debtName}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">{message}</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
              {isLoading ? "Processing..." : confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
