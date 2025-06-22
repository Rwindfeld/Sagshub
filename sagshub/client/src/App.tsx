import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/auth-context";
import { ProtectedRoute } from "./lib/protected-route";
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
import AdminPage from "@/pages/dashboard/admin";
import PrintFollowupPage from "@/pages/print-followup";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/print/followup" component={PrintFollowupPage} />
      <ProtectedRoute path="/" component={CustomerDashboard} />

      {/* Customer case details route */}
      <Route path="/case/:id">
        {({ id }) => <CaseDetails id={id} isCustomerView={true} />}
      </Route>

      {/* Worker routes - most specific first */}
      <ProtectedRoute path="/worker/cases/:id/internal" component={InternalCase} />
      <ProtectedRoute path="/worker/cases/:id" component={CaseDetails} />
      <ProtectedRoute path="/worker/cases/create" component={CaseCreatePage} />
      <ProtectedRoute path="/worker/cases" component={CasesPage} />
      <ProtectedRoute path="/worker/customers/:id" component={CustomerDetailsPage} />
      <ProtectedRoute path="/worker/customers" component={CustomersPage} />
      <ProtectedRoute path="/worker/rma/:id" component={RMADetails} />
      <ProtectedRoute path="/worker/rma" component={RMADashboard} />
      <ProtectedRoute path="/worker/orders/:id" component={OrderDetailPage} />
      <ProtectedRoute path="/worker/orders" component={OrdersPage} />
      <ProtectedRoute path="/worker/internal" component={InternalCasesPage} />
      <ProtectedRoute path="/worker/admin" component={AdminPage} />
      <ProtectedRoute path="/worker" component={WorkerDashboard} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;