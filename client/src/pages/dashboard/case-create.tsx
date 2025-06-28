import { CaseForm } from "@/components/case-form";
import { MenuLayout } from "@/components/menu-layout";
import { useToast } from "@/hooks/use-toast";
import { InsertCase, CaseWithCustomer } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { PrintFollowupDialog } from "@/components/print-followup-dialog";
import { useState } from "react";

export default function CaseCreatePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [createdCase, setCreatedCase] = useState<CaseWithCustomer | null>(null);

  const createCaseMutation = useMutation({
    mutationFn: async (data: InsertCase) => {
      console.log("CreateCase mutation called with:", data);
      const res = await apiRequest("POST", "/api/cases", data);
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.message || "Der opstod en fejl ved oprettelse af sagen");
      }
      const result = await res.json();
      console.log("Raw response fra backend:", result);
      return result;
    },
    onSuccess: (data: any) => {
      console.log("Case creation success, received data:", data);
      if (!data || !(data.id || data.ID || data.caseId)) {
        toast({
          title: "Fejl",
          description: "Kunne ikke hente sag til print. Prøv at genindlæse siden.",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setCreatedCase(data);
      setShowPrintDialog(true);
      console.log("Print dialog should show now, showPrintDialog:", true);
    },
    onError: (error: Error) => {
      console.error("Error in createCaseMutation:", error);
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertCase) => {
    console.log("[DEBUG] Data sendt til createCaseMutation:", data);
    createCaseMutation.mutate(data);
  };

  const handlePrint = () => {
    if (createdCase) {
      // Åbn print siden i nyt vindue
      const printUrl = `/print/followup?caseId=${createdCase.id}`;
      window.open(printUrl, '_blank');
    }
    setShowPrintDialog(false);
    setLocation("/worker/cases");
  };

  const handleSkipPrint = () => {
    setShowPrintDialog(false);
    setLocation("/worker/cases");
  };

  return (
    <MenuLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Opret ny sag</h1>
          <p className="text-muted-foreground">
            Opret en ny sag i systemet
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <CaseForm
            onSubmit={handleSubmit}
            isLoading={createCaseMutation.isPending}
          />
        </div>
      </div>

      <PrintFollowupDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={handlePrint}
        onSkip={handleSkipPrint}
        caseData={createdCase || undefined}
      />
    </MenuLayout>
  );
}