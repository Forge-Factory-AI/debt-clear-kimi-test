import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Confetti from "./Confetti";
import { PartyPopper } from "lucide-react";

interface CelebrationDialogProps {
  debtId: string;
  debtName: string;
  creditor: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CELEBRATED_KEY = "debtclear_celebrated";

function getCelebratedDebts(): string[] {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markDebtCelebrated(debtId: string) {
  const celebrated = getCelebratedDebts();
  if (!celebrated.includes(debtId)) {
    celebrated.push(debtId);
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify(celebrated));
  }
}

export function isDebtCelebrated(debtId: string): boolean {
  return getCelebratedDebts().includes(debtId);
}

export default function CelebrationDialog({
  debtId,
  debtName,
  creditor,
  open,
  onOpenChange,
}: CelebrationDialogProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
    }
  }, [open]);

  const handleDismiss = () => {
    markDebtCelebrated(debtId);
    onOpenChange(false);
  };

  return (
    <>
      <Confetti
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader className="items-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <PartyPopper className="h-8 w-8 text-green-400" />
            </div>
            <DialogTitle className="text-xl">Congratulations!</DialogTitle>
            <DialogDescription className="text-base">
              You paid off{" "}
              <strong className="text-foreground">{debtName}</strong> from{" "}
              <strong className="text-foreground">{creditor}</strong>!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center sm:justify-center">
            <Button onClick={handleDismiss} className="mt-2">
              <PartyPopper className="mr-2 h-4 w-4" />
              Awesome!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
