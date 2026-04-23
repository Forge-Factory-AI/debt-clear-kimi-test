import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getDebts, getDebtSummary, type Debt, type DebtSummary } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Trophy,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Formatting ─────────────────────────────────────────────

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Count-Up Hook ──────────────────────────────────────────

function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;

    function animate(timestamp: number) {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, start]);

  return value;
}

// ─── Skeleton Components ────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function DebtCardSkeleton() {
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
      </CardContent>
    </Card>
  );
}

// ─── Stat Card ──────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  isLoading?: boolean;
  delay?: number;
}

function StatCard({
  title,
  value,
  prefix = "",
  suffix = "",
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  isLoading,
  delay = 0,
}: StatCardProps) {
  const [startCount, setStartCount] = useState(false);
  const animated = useCountUp(value, 1200, startCount);

  useEffect(() => {
    const timer = setTimeout(() => setStartCount(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (isLoading) return <StatCardSkeleton />;

  const displayValue = startCount
    ? prefix + formatCurrency(animated).replace("$", "") + suffix
    : prefix + "0.00" + suffix;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{displayValue}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Debt Card ──────────────────────────────────────────────

interface DebtCardProps {
  debt: Debt;
  index: number;
}

function DebtCard({ debt, index }: DebtCardProps) {
  const original = debt.originalAmount ?? 0;
  const remaining = debt.remainingAmount ?? 0;
  const paid = original - remaining;
  const percentage = original > 0 ? Math.round((paid / original) * 100) : 0;

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100 + index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Card
      className={cn(
        "transition-all duration-500 hover:shadow-md",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
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
          <span className="font-medium">{formatCurrency(paid)} of {formatCurrency(original)}</span>
        </div>
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Remaining: {formatCurrency(remaining)}</span>
          {debt.dueDate && (
            <span>Due: {new Date(debt.dueDate).toLocaleDateString()}</span>
          )}
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
      <Button asChild>
        <Link to="/debts">
          Add Your First Debt
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}

// ─── Main Dashboard Page ────────────────────────────────────

export default function DashboardPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [debtsData, summaryData] = await Promise.all([getDebts(), getDebtSummary()]);
        if (!cancelled) {
          setDebts(debtsData);
          setSummary(summaryData);
        }
      } catch {
        if (!cancelled) setError("Failed to load dashboard data");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Button asChild size="sm">
          <Link to="/debts">
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Debts
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Debt"
          value={summary?.totalRemaining ?? 0}
          prefix="$"
          subtitle={`${summary?.activeCount ?? 0} active debt${(summary?.activeCount ?? 0) === 1 ? "" : "s"}`}
          icon={DollarSign}
          iconColor="text-red-400"
          isLoading={isLoading}
          delay={0}
        />
        <StatCard
          title="Total Paid"
          value={summary?.totalPaid ?? 0}
          prefix="$"
          subtitle="Lifetime payments"
          icon={TrendingUp}
          iconColor="text-green-400"
          isLoading={isLoading}
          delay={100}
        />
        <StatCard
          title="Original Amount"
          value={summary?.totalOriginal ?? 0}
          prefix="$"
          subtitle="Total debt principal"
          icon={TrendingDown}
          iconColor="text-yellow-400"
          isLoading={isLoading}
          delay={200}
        />
        <StatCard
          title="Paid Off"
          value={summary?.paidOffCount ?? 0}
          suffix=""
          subtitle={`of ${summary?.debtCount ?? 0} total debt${(summary?.debtCount ?? 0) === 1 ? "" : "s"}`}
          icon={Trophy}
          iconColor="text-primary"
          isLoading={isLoading}
          delay={300}
        />
      </div>

      {/* Active Debts Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Active Debts</h2>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DebtCardSkeleton />
            <DebtCardSkeleton />
            <DebtCardSkeleton />
          </div>
        ) : debts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {debts.map((debt, index) => (
              <DebtCard key={debt.id} debt={debt} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
