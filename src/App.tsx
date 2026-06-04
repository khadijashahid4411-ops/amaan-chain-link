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
import BecomeResponderPage from "./pages/BecomeResponderPage.tsx";
import EvidenceGuide from "./pages/EvidenceGuide.tsx";
import Appearance from "./pages/Appearance.tsx";
import EvidenceLibrary from "./pages/EvidenceLibrary.tsx";
import EmergencyContacts from "./pages/EmergencyContacts.tsx";
import Hotlines from "./pages/Hotlines.tsx";
import SafeZones from "./pages/SafeZones.tsx";
import Security from "./pages/Security.tsx";
import AdminZones from "./pages/AdminZones.tsx";
import ResponderPerformance from "./pages/ResponderPerformance.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const Shell = ({ children }: { children: React.ReactNode }) => <AppShell>{children}</AppShell>;
const wrap = (el: React.ReactNode, role?: "admin" | "responder") => (
  <ProtectedRoute requireRole={role as any}>
    <Shell>{el}</Shell>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={wrap(<Index />)} />
            <Route path="/responder" element={wrap(<ResponderDashboard />)} />
            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/install" element={wrap(<Install />)} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
            <Route path="/evidence" element={wrap(<UserEvidence />)} />
            <Route path="/responder/evidence" element={wrap(<ResponderEvidence />)} />
            <Route path="/become-responder" element={wrap(<BecomeResponderPage />)} />
            <Route path="/evidence-guide" element={wrap(<EvidenceGuide />)} />
            <Route path="/appearance" element={wrap(<Appearance />)} />
            <Route path="/evidence-library" element={wrap(<EvidenceLibrary />)} />
            <Route path="/contacts" element={wrap(<EmergencyContacts />)} />
            <Route path="/hotlines" element={wrap(<Hotlines />)} />
            <Route path="/safe-zones" element={wrap(<SafeZones />)} />
            <Route path="/security" element={wrap(<Security />)} />
            <Route path="/admin/zones" element={wrap(<AdminZones />, "admin")} />
            <Route path="/responder/performance" element={wrap(<ResponderPerformance />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
