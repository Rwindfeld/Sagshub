import { useQuery, useMutation } from "@tanstack/react-query";
import { Case } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuLayout } from "@/components/menu-layout";
import { useState } from "react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { ArrowLeft, Clock, FileText, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";

interface InternalCaseProps {
  params: { id: string }
}

interface CaseWithCustomer extends Case {
  customerName: string;
  customerPhone: string;
}

export default function InternalCase({ params }: InternalCaseProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [internalNote, setInternalNote] = useState("");
  const [timeSpent, setTimeSpent] = useState("");

  const { data: case_, isLoading } = useQuery<CaseWithCustomer>({
    queryKey: ["/api/cases", params.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cases/${params.id}`);
      return res.json();
    },
  });

  const addInternalNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cases/${params.id}/internal-notes`, {
        note: internalNote,
        timeSpent: parseInt(timeSpent) || 0
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", params.id] });
      toast({
        title: "Note tilføjet",
        description: "Den interne note er blevet gemt",
      });
      setInternalNote("");
      setTimeSpent("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || !case_) {
    return <div>Indlæser...</div>;
  }

  return (
    <MenuLayout>
      <div className="p-6 bg-background">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => setLocation("/cases")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbage til sagsoversigt
          </Button>
          <h1 className="text-2xl font-bold">Intern sag #{case_.caseNumber}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Venstre kolonne - Sagsinformation */}
          <div className="space-y-6">
            <Card className="bg-muted">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Sagsinformation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Kunde</dt>
                    <dd className="text-sm mt-1">{case_.customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Telefon</dt>
                    <dd className="text-sm mt-1">{case_.customerPhone}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="text-sm mt-1">{case_.status}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Oprettet</dt>
                    <dd className="text-sm mt-1">
                      {format(new Date(case_.createdAt), "d. MMM yyyy", { locale: da })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Beskrivelse</dt>
                    <dd className="text-sm mt-1 whitespace-pre-wrap">{case_.description}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="bg-muted">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Tidsregistrering
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Tidsforbrug (minutter)</label>
                    <input
                      type="number"
                      value={timeSpent}
                      onChange={(e) => setTimeSpent(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                      placeholder="Indtast antal minutter"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Højre kolonne - Interne noter */}
          <div className="space-y-6">
            <Card className="bg-muted">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Interne noter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Tilføj intern note..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="min-h-[100px] bg-background"
                  />
                  <Button
                    className="w-full"
                    onClick={() => addInternalNoteMutation.mutate()}
                    disabled={!internalNote || addInternalNoteMutation.isPending}
                  >
                    {addInternalNoteMutation.isPending ? "Gemmer..." : "Tilføj note"}
                  </Button>

                  <div className="mt-6 space-y-4">
                    {/* Her skal vi vise tidligere noter - dette implementeres senere */}
                    <p className="text-sm text-muted-foreground">Ingen tidligere noter</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}