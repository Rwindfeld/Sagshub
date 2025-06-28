// =============================================================================
// SAGSHUB HOVEDAPPLIKATION
// =============================================================================
// Denne fil er hjerten i SagsHub frontend applikationen og håndterer:
// - React Router setup med alle routes til forskellige sider
// - Global providers til state management (Auth, Theme, Query Client)
// - Layout struktur med beskyttede routes
// - URL routing mellem kunde- og medarbejder-views
// =============================================================================

// Import af React Router og navigation biblioteker
import { Switch, Route } from "wouter";                    // Lightweight React router
import { queryClient } from "./lib/queryClient";           // TanStack Query konfiguration til data fetching
import { QueryClientProvider } from "@tanstack/react-query"; // Provider til Query Client
import { Toaster } from "@/components/ui/toaster";        // Toast notifikationer UI komponent
import { AuthProvider } from "@/context/auth-context";    // Autentificerings context provider
import { ThemeProvider } from "@/context/theme-context";  // Dark/light mode theme provider
import { ProtectedRoute } from "./lib/protected-route";   // Komponent til beskyttelse af routes

// Import af alle sider/pages i applikationen
import NotFound from "@/pages/not-found";                 // 404 side
import AuthPage from "@/pages/auth-page";                 // Login side til medarbejdere og kunder
import CustomerDashboard from "@/pages/dashboard/customer"; // Kunde dashboard (kan se egne sager)
import WorkerDashboard from "@/pages/dashboard/worker";    // Medarbejder dashboard med oversigt
import CustomersPage from "@/pages/dashboard/customers";   // Liste over alle kunder
import CustomerDetailsPage from "@/pages/dashboard/customer-details"; // Detaljer om specifik kunde
import CaseDetails from "@/pages/dashboard/case-details";  // Detaljer om specifik sag
import CasesPage from "@/pages/dashboard/cases";          // Liste over alle sager
import CaseCreatePage from "@/pages/dashboard/case-create"; // Opret ny sag side
import RMADashboard from "@/pages/dashboard/rma";         // RMA (reklamation) oversigt
import RMADetails from "@/pages/dashboard/rma-details";   // RMA detaljer
import InternalCase from "@/pages/dashboard/internal-case"; // Intern kommunikation om specifik sag
import InternalCasesPage from "@/pages/dashboard/internal"; // Oversigt over intern kommunikation
import OrdersPage from "@/pages/dashboard/orders";        // Liste over bestillinger
import OrderDetailPage from "@/pages/dashboard/order-detail"; // Detaljer om specifik bestilling
import AdminPage from "@/pages/dashboard/admin";          // Administrator side med statistikker
import PrintFollowupPage from "@/pages/print-followup";   // Print-venlig opfølgningsside

// =============================================================================
// ROUTER KOMPONENT
// =============================================================================
// Definerer alle routes og deres tilsvarende komponenter
function Router() {
  return (
    <Switch>
      {/* =============================================================
          OFFENTLIGE ROUTES (ikke beskyttede)
          ============================================================= */}
      
      {/* Login side for både medarbejdere og kunder */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Print-venlig side til opfølgning (kan tilgås uden login) */}
      <Route path="/print/followup" component={PrintFollowupPage} />
      
      {/* Standard route (/) - omdirigerer til kundens dashboard */}
      <ProtectedRoute path="/" component={CustomerDashboard} />

      {/* =============================================================
          KUNDE ROUTES
          ============================================================= */}
      
      {/* Kunde kan se detaljer om deres egne sager */}
      <Route path="/case/:id">
        {({ id }) => <CaseDetails id={id} isCustomerView={true} />}
      </Route>

      {/* =============================================================
          MEDARBEJDER ROUTES (beskyttede - kun for medarbejdere)
          BEMÆRK: Mest specifikke routes først for korrekt matching
          ============================================================= */}
      
      {/* Intern kommunikation om specifik sag */}
      <ProtectedRoute path="/worker/cases/:id/internal" component={InternalCase} />
      
      {/* Sag detaljer (medarbejder view med alle funktioner) */}
      <ProtectedRoute path="/worker/cases/:id" component={CaseDetails} />
      
      {/* Opret ny sag */}
      <ProtectedRoute path="/worker/cases/create" component={CaseCreatePage} />
      
      {/* Liste over alle sager */}
      <ProtectedRoute path="/worker/cases" component={CasesPage} />
      
      {/* Detaljer om specifik kunde */}
      <ProtectedRoute path="/worker/customers/:id" component={CustomerDetailsPage} />
      
      {/* Liste over alle kunder */}
      <ProtectedRoute path="/worker/customers" component={CustomersPage} />
      
      {/* RMA detaljer */}
      <ProtectedRoute path="/worker/rma/:id" component={RMADetails} />
      
      {/* RMA oversigt */}
      <ProtectedRoute path="/worker/rma" component={RMADashboard} />
      
      {/* Bestilling detaljer */}
      <ProtectedRoute path="/worker/orders/:id" component={OrderDetailPage} />
      
      {/* Liste over alle bestillinger */}
      <ProtectedRoute path="/worker/orders" component={OrdersPage} />
      
      {/* Intern kommunikation oversigt */}
      <ProtectedRoute path="/worker/internal" component={InternalCasesPage} />
      
      {/* Administrator side (kun for admins) */}
      <ProtectedRoute path="/worker/admin" component={AdminPage} />
      
      {/* Medarbejder dashboard (hovedside for medarbejdere) */}
      <ProtectedRoute path="/worker" component={WorkerDashboard} />

      {/* =============================================================
          FALLBACK ROUTE
          ============================================================= */}
      
      {/* 404 side hvis ingen andre routes matcher */}
      <Route component={NotFound} />
    </Switch>
  );
}

// =============================================================================
// HOVEDAPPLIKATION KOMPONENT
// =============================================================================
// Wrapper hele applikationen med nødvendige providers
function App() {
  return (
    // =================================================================
    // REACT QUERY PROVIDER
    // =================================================================
    // Giver adgang til TanStack Query i hele applikationen
    // Håndterer caching, refetching, og state management for API calls
    <QueryClientProvider client={queryClient}>
      
      {/* =============================================================
          THEME PROVIDER
          ============================================================= */}
      {/* Håndterer dark/light mode og tema-relateret state */}
      <ThemeProvider>
        
        {/* =========================================================
            AUTH PROVIDER
            ========================================================= */}
        {/* Håndterer bruger autentificering og session state */}
        <AuthProvider>
          
          {/* =====================================================
              ROUTER
              ===================================================== */}
          {/* Håndterer URL routing og navigation */}
          <Router />
          
          {/* =====================================================
              TOAST NOTIFIKATIONER
              ===================================================== */}
          {/* Globale toast beskeder til bruger feedback */}
          <Toaster />
          
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Eksporterer App komponenten som standard export
export default App;