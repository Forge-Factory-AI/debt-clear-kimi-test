import { useAuth } from "@/context/AuthContext";
import { LogOut, Shield } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sky-500" />
            <h1 className="text-lg font-semibold">DebtClear</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">
            Welcome, {user?.name || user?.email}
          </h2>
          <p className="text-muted-foreground">
            Your dashboard is ready. Debt tracking features coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
