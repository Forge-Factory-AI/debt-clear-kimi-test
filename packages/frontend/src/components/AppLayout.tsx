import { useState, useRef, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  Trophy,
  Archive,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/debts", label: "Debts", icon: CreditCard },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/archived", label: "Archived", icon: Archive },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  return (
    <div className="flex h-full flex-col">
      {/* App name */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground hover:text-primary transition-colors"
          onClick={onNavigate}
        >
          <CreditCard className="h-5 w-5 text-primary" />
          DebtClear
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    "min-h-[44px]",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User menu */}
      <div className="border-t border-border p-3">
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors",
              "min-h-[44px]",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <span className="flex items-center gap-2 truncate">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </span>
              <span className="truncate">{user?.email}</span>
            </span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform", userMenuOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {userMenuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-1 rounded-md border bg-card shadow-lg"
              role="menu"
            >
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-destructive transition-colors",
                  "min-h-[44px]",
                  "hover:bg-destructive/10"
                )}
                role="menuitem"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 border-r border-border bg-card"
        aria-label="Sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
        >
          <CreditCard className="h-5 w-5 text-primary" />
          DebtClear
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
            "min-h-[44px] min-w-[44px]"
          )}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-sidebar"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Mobile sidebar drawer */}
          <aside
            id="mobile-sidebar"
            className="fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border overflow-y-auto"
            aria-label="Mobile sidebar"
          >
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
