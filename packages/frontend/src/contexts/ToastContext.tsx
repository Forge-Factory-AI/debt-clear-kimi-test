import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const existing = timeoutsRef.current.get(id);
    if (existing) {
      window.clearTimeout(existing);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timeout = window.setTimeout(() => {
        removeToast(id);
      }, 4000);
      timeoutsRef.current.set(id, timeout);
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right duration-300",
              t.type === "success"
                ? "border-green-500/20 bg-card text-foreground"
                : "border-destructive/20 bg-card text-destructive"
            )}
          >
            {t.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
            )}
            <span className="text-sm font-medium">{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="ml-2 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
