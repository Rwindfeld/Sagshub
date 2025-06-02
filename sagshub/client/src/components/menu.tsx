import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UnreadCountResponse {
  count: number;
}

export function Menu() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: unreadCountData, error } = useQuery<UnreadCountResponse>({
    queryKey: ["unread-count"],
    queryFn: async () => {
      if (!user?.isWorker) return { count: 0 };
      try {
        const response = await apiRequest("GET", "/api/internal-cases/unread-count");
        return response.json();
      } catch (error) {
        console.error("Error fetching unread count:", error);
        return { count: 0 };
      }
    },
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: !!user?.isWorker,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (unreadCountData) {
      setUnreadCount(unreadCountData.count || 0);
    }
  }, [unreadCountData]);

  if (error) {
    console.error("Error in unread count query:", error);
  }

  return (
    <nav className="h-full w-full bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">TJdata Menu</h2>
          {user?.isWorker && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/worker/internal")}
              className="relative"
              title="Interne sager"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className={cn(
                    "absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0",
                    unreadCount > 99 && "w-6"
                  )}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant={location === "/worker" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker")}
          >
            Oversigt
          </Button>
          <Button
            variant={location.startsWith("/worker/cases") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/cases")}
          >
            Sager
          </Button>
          <Button
            variant={location === "/worker/customers" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/customers")}
          >
            Kunder
          </Button>
          <Button
            variant={location.startsWith("/worker/rma") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/rma")}
          >
            RMA
          </Button>
          <Button
            variant={location.startsWith("/worker/orders") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/orders")}
          >
            Bestillinger
          </Button>
          <Button
            variant={location === "/worker/internal" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/internal")}
          >
            Interne Sager
          </Button>
          <Button
            variant={location === "/worker/admin" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/admin")}
          >
            Administration
          </Button>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          {user?.isWorker && (
            <div className="text-sm text-muted-foreground">
              Logget ind som: {user.username}
            </div>
          )}
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log ud
          </Button>
        </div>
      </div>
    </nav>
  );
} 