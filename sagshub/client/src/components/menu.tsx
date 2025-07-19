// =============================================================================
// SAGSHUB NAVIGATION MENU KOMPONENT
// =============================================================================
// Denne komponent håndterer hovednavigationen for medarbejdere og indeholder:
// - Navigation links til alle medarbejder sider
// - Real-time notifikationer for ulæste interne beskeder
// - Dark/light mode toggle
// - Live aktivitets feed
// - Bruger information og logout funktionalitet
// =============================================================================

// Import af nødvendige hooks og komponenter
import { useAuth } from "@/context/auth-context";          // Autentificerings context
import { Button } from "@/components/ui/button";           // UI button komponent
import { LogOut, Bell } from "lucide-react";               // Ikoner fra Lucide
import { useLocation } from "wouter";                      // React Router location hook
import { useQuery, useQueryClient } from "@tanstack/react-query"; // TanStack Query hooks
import { apiRequest } from "@/lib/queryClient";            // API request utility
import { useEffect, useState } from "react";               // React hooks
import { Badge } from "@/components/ui/badge";             // UI badge komponent til notifikationer
import { cn } from "@/lib/utils";                          // Utility til CSS class sammensætning
import { LiveActivityMenu } from "./live-activity-menu";   // Live aktivitets komponent
import { ThemeToggle } from "./theme-toggle";              // Dark/light mode toggle

// =============================================================================
// TYPE DEFINITIONER
// =============================================================================
// Interface til API response for ulæste beskeder count
interface UnreadCountResponse {
  count: number;                                           // Antal ulæste interne beskeder
}

// =============================================================================
// MENU KOMPONENT
// =============================================================================
export function Menu() {
  // =================================================================
  // HOOKS OG STATE
  // =================================================================
  const { user, logoutMutation } = useAuth();              // Henter bruger info og logout funktion
  const [location, setLocation] = useLocation();           // Nuværende URL location og navigation
  const [unreadCount, setUnreadCount] = useState(0);       // Local state for ulæste beskeder count
  const queryClient = useQueryClient();                    // Query client til cache invalidation

  // =================================================================
  // ULÆSTE BESKEDER QUERY
  // =================================================================
  // Henter antal ulæste interne beskeder med automatisk polling
  const { data: unreadCountData, error, refetch } = useQuery<UnreadCountResponse>({
    queryKey: ["/api/internal-cases/unread-count"],        // Unik key til caching
    queryFn: async () => {
      if (!user?.isWorker) return { count: 0 };            // Kun medarbejdere kan se interne beskeder
      try {
        const response = await apiRequest("GET", "/api/internal-cases/unread-count");
        return response.json();
      } catch (error) {
        console.error("Error fetching unread count:", error);
        return { count: 0 };                               // Fallback ved fejl
      }
    },
    refetchInterval: 5000,                                // Opdaterer automatisk hver 5 sekunder (hurtigere)
    enabled: !!user?.isWorker,                            // Kun aktiv for medarbejdere
    retry: 3,                                             // Prøver 3 gange ved fejl
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5000,                                      // Data er fresh i 5 sekunder (hurtigere)
    gcTime: 1000 * 60 * 2,                               // Garbage collection efter 2 minutter (hurtigere)
  });

  // =================================================================
  // EFFECT HOOKS
  // =================================================================
  // Opdaterer local state når query data ændres
  useEffect(() => {
    if (unreadCountData) {
      setUnreadCount(unreadCountData.count || 0);
    }
  }, [unreadCountData]);

  // Logger fejl hvis query fejler
  if (error) {
    console.error("Error in unread count query:", error);
  }

  // =================================================================
  // EVENT HANDLERS
  // =================================================================
  // Håndterer klik på interne sager knap
  const handleInternalCasesClick = () => {
    // Tvinger opdatering af ulæste beskeder count før navigation
    queryClient.invalidateQueries({ queryKey: ["/api/internal-cases/unread-count"] });
    refetch();                                            // Refetch data immediately
    setLocation("/worker/internal");                      // Navigér til interne sager side
  };

  // =================================================================
  // RENDER
  // =================================================================
  return (
    <nav className="h-full w-full bg-white dark:bg-gray-900 shadow-sm border-r dark:border-gray-700">
      <div className="p-4">
        
        {/* =============================================================
            HEADER SEKTION MED LOGO OG ACTIONS
            ============================================================= */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">TJdata Menu</h2>
          <div className="flex items-center gap-2">
            
            {/* Dark/Light mode toggle */}
            <ThemeToggle />
            
            {/* Notifikations knap (kun for medarbejdere) */}
            {user?.isWorker && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleInternalCasesClick}
                className="relative"
                title="Interne sager"
              >
                <Bell className="h-5 w-5" />
                {/* Badge med antal ulæste beskeder */}
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className={cn(
                      "absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0",
                      unreadCount > 99 && "w-6"          // Større badge for høje tal
                    )}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount} {/* Maksimum visning er 99+ */}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* =============================================================
            NAVIGATION LINKS
            ============================================================= */}
        <div className="flex flex-col gap-2">
          
          {/* Oversigt/Dashboard link */}
          <Button
            variant={location === "/worker" ? "default" : "ghost"}  // Aktiv styling hvis på denne side
            className="w-full justify-start"
            onClick={() => setLocation("/worker")}
          >
            Oversigt
          </Button>
          
          {/* Sager link (aktiv for alle /worker/cases routes) */}
          <Button
            variant={location.startsWith("/worker/cases") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/cases")}
          >
            Sager
          </Button>
          
          {/* Kunder link */}
          <Button
            variant={location === "/worker/customers" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/customers")}
          >
            Kunder
          </Button>
          
          {/* RMA (reklamation) link */}
          <Button
            variant={location.startsWith("/worker/rma") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/rma")}
          >
            RMA
          </Button>
          
          {/* Bestillinger link */}
          <Button
            variant={location.startsWith("/worker/orders") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/orders")}
          >
            Bestillinger
          </Button>
          
          {/* Interne sager link med special handler */}
          <Button
            variant={location === "/worker/internal" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={handleInternalCasesClick}              // Bruger special handler for cache invalidation
          >
            Interne Sager
          </Button>
          
          {/* Administration link (kun for admins) */}
          <Button
            variant={location === "/worker/admin" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setLocation("/worker/admin")}
          >
            Administration
          </Button>
        </div>
        
        {/* =============================================================
            FOOTER SEKTION MED BRUGER INFO OG LOGOUT
            ============================================================= */}
        <div className="mt-6 flex flex-col gap-2">
          
          {/* Bruger information (kun for medarbejdere) */}
          {user?.isWorker && (
            <div className="text-sm text-muted-foreground">
              Logget ind som: {user.username}
            </div>
          )}
          
          {/* Logout knap */}
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => logoutMutation.mutate()}        // Kalder logout mutation fra auth context
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log ud
          </Button>
          
          {/* Live aktivitets feed (kun for medarbejdere) */}
          {user?.isWorker && <LiveActivityMenu />}
        </div>
      </div>
    </nav>
  );
} 