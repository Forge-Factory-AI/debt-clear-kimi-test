import { useState, useEffect, useCallback } from "react";
import { getPaidOffDebts, type Debt } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, DollarSign, Sparkles } from "lucide-react";

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
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Skeleton ───────────────────────────────────────────────

function AchievementSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-3 w-28 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

// ─── Trophy Card ────────────────────────────────────────────

interface TrophyCardProps {
  debt: Debt;
  rank: number;
}

function TrophyCard({ debt, rank }: TrophyCardProps) {
  const original = debt.originalAmount ?? 0;

  const rankStyles = [
    "from-yellow-500/20 to-amber-600/10 border-yellow-500/30",
    "from-slate-400/20 to-slate-500/10 border-slate-400/30",
    "from-orange-700/20 to-orange-800/10 border-orange-700/30",
  ];

  const rankIcons = [
    <Trophy key="1" className="h-5 w-5 text-yellow-400" />,
    <Trophy key="2" className="h-5 w-5 text-slate-300" />,
    <Trophy key="3" className="h-5 w-5 text-orange-400" />,
  ];

  const rankBadge = rank <= 3 ? rankIcons[rank - 1] : null;
  const gradientClass = rank <= 3 ? rankStyles[rank - 1] : "from-green-500/10 to-emerald-600/5 border-green-500/20";

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${gradientClass} transition-all hover:shadow-md hover:scale-[1.01]`}>
      {/* Decorative sparkle */}
      <Sparkles className="absolute top-3 right-3 h-16 w-16 text-primary/5 rotate-12" aria-hidden="true" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">{debt.name}</CardTitle>
          </div>
          {rankBadge && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/50">
              {rankBadge}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{debt.creditor}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            Paid in full
          </span>
          <span className="font-semibold text-green-400">{formatCurrency(original)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Paid off
          </span>
          <span className="font-medium">{formatDate(debt.paidOffAt)}</span>
        </div>
        <div className="pt-1">
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
            Debt Free
          </span>
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
        <Trophy className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No achievements yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        You haven&apos;t paid off any debts yet. Keep making payments and your achievements will appear here.
      </p>
    </Card>
  );
}

// ─── Main Achievements Page ─────────────────────────────────

export default function AchievementsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPaidOffDebts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getPaidOffDebts();
      // Sort by payoff date descending (most recent first)
      const sorted = [...data].sort((a, b) => {
        const dateA = a.paidOffAt ? new Date(a.paidOffAt).getTime() : 0;
        const dateB = b.paidOffAt ? new Date(b.paidOffAt).getTime() : 0;
        return dateB - dateA;
      });
      setDebts(sorted);
    } catch {
      setError("Failed to load achievements");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaidOffDebts();
  }, [loadPaidOffDebts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
        {!isLoading && debts.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {debts.length} debt{debts.length !== 1 ? "s" : ""} paid off
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AchievementSkeleton />
          <AchievementSkeleton />
          <AchievementSkeleton />
        </div>
      ) : debts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {debts.map((debt, index) => (
            <TrophyCard key={debt.id} debt={debt} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
