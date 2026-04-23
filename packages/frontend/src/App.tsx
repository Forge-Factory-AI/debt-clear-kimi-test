import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import DebtsPage from "@/pages/DebtsPage";
import DebtDetailPage from "@/pages/DebtDetailPage";
import AchievementsPage from "@/pages/AchievementsPage";
import ArchivedPage from "@/pages/ArchivedPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />
      <Route
        path="/dashboard"
        element={
          <AppLayoutWrapper>
            <DashboardPage />
          </AppLayoutWrapper>
        }
      />
      <Route
        path="/debts"
        element={
          <AppLayoutWrapper>
            <DebtsPage />
          </AppLayoutWrapper>
        }
      />
      <Route
        path="/debts/:id"
        element={
          <AppLayoutWrapper>
            <DebtDetailPage />
          </AppLayoutWrapper>
        }
      />
      <Route
        path="/achievements"
        element={
          <AppLayoutWrapper>
            <AchievementsPage />
          </AppLayoutWrapper>
        }
      />
      <Route
        path="/archived"
        element={
          <AppLayoutWrapper>
            <ArchivedPage />
          </AppLayoutWrapper>
        }
      />
      <Route
        path="/"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
