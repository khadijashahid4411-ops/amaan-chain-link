import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import UserDashboard from "./UserDashboard";

const Index = () => {
  const { loading, primaryRole } = useAuth();
  if (loading) return null;
  if (primaryRole === "admin") return <Navigate to="/admin" replace />;
  if (primaryRole === "responder") return <Navigate to="/responder" replace />;
  return <UserDashboard />;
};

export default Index;
