import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";

// Pages
import Auth        from "@/pages/Auth";
import Dashboard   from "@/pages/Dashboard";
import Pools       from "@/pages/Pools";
import Notes       from "@/pages/Notes";
import PoolChat    from "@/pages/PoolChat";
import MasterGuide from "@/pages/MasterGuide";
import NotFound    from "@/pages/NotFound";

// Layout (your existing sidebar/nav wrapper — keep as-is)
import Layout from "@/components/Layout";

// ── Route guard ───────────────────────────────────────────────────────────────
// Shows nothing while the app is checking localStorage for a stored token.
// Once the check is done, redirects unauthenticated users to /auth.
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthLoading } = useApp();

  if (isAuthLoading) {
    // Render a full-screen spinner instead of flashing the login page
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/auth" element={<Auth />} />

        {/* Protected – all wrapped in your Layout */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index         element={<Dashboard />} />
          <Route path="pools"  element={<Pools />} />
          <Route path="notes"  element={<Notes />} />
          <Route path="guide"  element={<MasterGuide />} />
          <Route path="pool/:poolId/chat" element={<PoolChat />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
