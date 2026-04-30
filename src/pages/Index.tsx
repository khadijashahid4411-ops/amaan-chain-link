import { useAuth } from "@/contexts/AuthContext";
import UserDashboard from "./UserDashboard";

const Index = () => {
  const { loading } = useAuth();
  if (loading) return null;
  return <UserDashboard />;
};

export default Index;
