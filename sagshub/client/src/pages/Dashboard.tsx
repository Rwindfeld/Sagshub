import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";
import { useLocation } from "wouter";
import WorkerDashboard from "./dashboard/worker";
import CustomerDashboard from "./dashboard/customer";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect baseret på brugertype
      if (user.isWorker || user.isAdmin) {
        setLocation("/worker");
      } else if (user.isCustomer) {
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Vis det relevante dashboard baseret på brugertype
  if (user.isWorker || user.isAdmin) {
    return <WorkerDashboard />;
  } else if (user.isCustomer) {
    return <CustomerDashboard />;
  }

  // Fallback
  return <WorkerDashboard />;
} 