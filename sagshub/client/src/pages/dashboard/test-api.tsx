import { useState } from "react";
import { MenuLayout } from "@/components/menu-layout";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestApiPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async (endpoint: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest("GET", endpoint);
      const data = await response.json();
      console.log("API Response:", data);
      setResults(data);
    } catch (err: any) {
      console.error("API Error:", err);
      setError(err.message || "Der opstod en fejl");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuLayout>
      <div className="container mx-auto py-1">
        <h1 className="text-3xl font-bold mb-6">API Test</h1>
        
        <div className="space-y-4 mb-8">
          <Button 
            onClick={() => testApi("/api/orders")} 
            disabled={loading}
            className="mr-2"
          >
            Test Orders API
          </Button>
          
          <Button 
            onClick={() => testApi("/api/customers")} 
            disabled={loading}
            className="mr-2"
          >
            Test Customers API
          </Button>
          
          <Button 
            onClick={() => testApi("/api/cases")} 
            disabled={loading}
            className="mr-2"
          >
            Test Cases API
          </Button>
        </div>

        {loading && <p>Indlæser...</p>}
        
        {error && (
          <Card className="mb-6 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">Fejl</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        )}
        
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>API Resultat</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MenuLayout>
  );
} 