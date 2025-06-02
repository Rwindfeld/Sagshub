import { useQuery } from "@tanstack/react-query";
import { Case } from "@shared/schema";
import { CaseList } from "@/components/case-list";
import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { LogOut, Phone, Mail } from "lucide-react";

export default function CustomerDashboard() {
  const { user, logoutMutation } = useAuth();

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases", "customer", user?.customerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      // For customer users, the backend will automatically filter by their customerId
      params.append("isWorker", "false");
      
      const res = await apiRequest("GET", `/api/cases?${params.toString()}`);
      const data = await res.json();
      // Extract items array if it's a paginated response
      return Array.isArray(data) ? data : data.items || [];
    },
    enabled: !!user && user.isCustomer, // Only fetch if user is a customer
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Indlæser dine sager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TJdata Kunde Portal</h1>
              <p className="text-gray-600">Velkommen, {user?.name}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log ud
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Customer Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Dine oplysninger</h2>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <span className="font-medium mr-2">Navn:</span>
                  {user?.name}
                </div>
                {user?.isCustomer && (
                  <>
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>Kontakt TJdata for supportspørgsmål</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>salg@tjdata.dk</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">TJdata ApS</h3>
                <p className="text-sm text-blue-700">
                  Ørstedsgade 8<br />
                  5000 Odense C<br />
                  Tlf: 46 93 20 61
                </p>
              </div>
            </div>
          </div>

          {/* Cases List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Dine sager</h2>
                <p className="text-gray-600 mt-1">
                  Her kan du følge status på dine reparationer og henvendelser
                </p>
              </div>
              
              {cases && cases.length > 0 ? (
                <CaseList cases={cases} isCustomerView={true} />
              ) : (
                <div className="p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen sager fundet</h3>
                  <p className="text-gray-600">
                    Du har ingen aktive sager i øjeblikket. Kontakt TJdata hvis du har spørgsmål.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}