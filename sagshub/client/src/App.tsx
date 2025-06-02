import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import CustomerDashboard from "@/pages/dashboard/customer";
import WorkerDashboard from "@/pages/dashboard/worker";
import CustomersPage from "@/pages/dashboard/customers";
import CustomerDetailsPage from "@/pages/dashboard/customer-details";
import CaseDetails from "@/pages/dashboard/case-details";
import CasesPage from "@/pages/dashboard/cases";
import CaseCreatePage from "@/pages/dashboard/case-create";
import RMADashboard from "@/pages/dashboard/rma";
import RMADetails from "@/pages/dashboard/rma-details";
import InternalCase from "@/pages/dashboard/internal-case";
import InternalCasesPage from "@/pages/dashboard/internal";
import OrdersPage from "@/pages/dashboard/orders";
import OrderDetailPage from "@/pages/dashboard/order-detail";
import TestApiPage from "@/pages/dashboard/test-api";
import AdminPage from "@/pages/dashboard/admin";
import PrintFollowupPage from "@/pages/print-followup";
import { useEffect } from "react";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Redirect to /auth if not authenticated
  if (!user && location !== "/auth") {
    return <Redirect to="/auth" />;
  }

  // Redirect authenticated users away from auth page
  if (user && location === "/auth") {
    if (user.isWorker) {
      return <Redirect to="/worker" />;
    } else {
      return <Redirect to="/" />;
    }
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      {/* Protected root route */}
      <Route path="/">
        {() => {
          if (!user) {
            return <Redirect to="/auth" />;
          }
          return <CustomerDashboard />;
        }}
      </Route>

      {/* Customer case details route */}
      <Route path="/case/:id">
        {({ id }) => {
          if (!user || user.isWorker) {
            return <Redirect to="/auth" />;
          }
          return <CaseDetails id={id} isCustomerView={true} />;
        }}
      </Route>

      {/* Worker routes - most specific first */}
      <ProtectedRoute path="/worker/cases/create" component={CaseCreatePage} />
      <ProtectedRoute path="/worker/cases/:id" component={CaseDetails} />
      <ProtectedRoute path="/worker/cases" component={CasesPage} />
      
      {/* Print route - no authentication needed for printing */}
      <Route path="/print/followup" component={PrintFollowupPage} />
      <Route path="/worker/customers/:id">
        {({ id }) => {
          if (!user || !user.isWorker) {
            return <Redirect to="/auth" />;
          }
          return <CustomerDetailsPage id={id} />;
        }}
      </Route>
      <ProtectedRoute path="/worker/customers" component={CustomersPage} />
      <ProtectedRoute path="/worker/rma/:id" component={RMADetails} />
      <ProtectedRoute path="/worker/rma" component={RMADashboard} />
      <ProtectedRoute path="/worker/orders/:id" component={OrderDetailPage} />
      <ProtectedRoute path="/worker/orders" component={OrdersPage} />
      <ProtectedRoute path="/worker/test-api" component={TestApiPage} />
      <ProtectedRoute path="/worker/cases/:id/internal" component={InternalCase} />
      <ProtectedRoute path="/worker/internal" component={InternalCasesPage} />
      <ProtectedRoute path="/worker/admin" component={AdminPage} />
      <ProtectedRoute path="/worker" component={WorkerDashboard} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}