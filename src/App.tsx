import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResponderDashboard from "./pages/ResponderDashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import Install from "./pages/Install.tsx";
import Profile from "./pages/Profile.tsx";
import Complaints from "./pages/Complaints.tsx";
import UserEvidence from "./pages/UserEvidence.tsx";
import ResponderEvidence from "./pages/ResponderEvidence.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const Shell = ({ children }: { children: React.ReactNode }) => <AppShell>{children}</AppShell>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Shell><Index /></Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/responder"
              element={
                <ProtectedRoute>
                  <Shell><ResponderDashboard /></Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/install"
              element={
                <ProtectedRoute>
                  <Shell><Install /></Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/complaints"
              element={
                <ProtectedRoute>
                  <Complaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evidence"
              element={
                <ProtectedRoute>
                  <Shell><UserEvidence /></Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/responder/evidence"
              element={
                <ProtectedRoute>
                  <Shell><ResponderEvidence /></Shell>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
