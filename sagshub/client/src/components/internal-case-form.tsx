import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InternalCaseFormProps {
  caseId: number;
  onSuccess?: () => void;
}

export function InternalCaseForm({ caseId, onSuccess }: InternalCaseFormProps) {
  const { toast } = useToast();
  const [receiverId, setReceiverId] = useState("");
  const [message, setMessage] = useState("");

  // Fetch workers
  const { data: workers, isLoading: isLoadingWorkers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });

  const sendInternalCaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/internal-cases", {
        caseId,
        receiverId: parseInt(receiverId),
        message,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Intern sag sendt",
        description: "Beskeden er blevet sendt til medarbejderen",
      });
      setMessage("");
      setReceiverId("");
      
      // Invalider cache for interne sager
      queryClient.invalidateQueries({ queryKey: ["/api/internal-cases"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message || "Der opstod en fejl ved afsendelse af intern sag",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="receiver">Vælg medarbejder</Label>
        <Select
          value={receiverId}
          onValueChange={setReceiverId}
        >
          <SelectTrigger id="receiver">
            <SelectValue placeholder="Vælg medarbejder" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingWorkers ? (
              <SelectItem value="" disabled>Indlæser medarbejdere...</SelectItem>
            ) : (
              workers?.filter(worker => worker.isWorker)
                .map((worker) => (
                  <SelectItem key={worker.id} value={worker.id.toString()}>
                    {worker.name || worker.username}
                  </SelectItem>
                ))
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="message">Besked</Label>
        <Textarea
          id="message"
          placeholder="Skriv din besked her..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          onClick={() => sendInternalCaseMutation.mutate()}
          disabled={!receiverId || !message || sendInternalCaseMutation.isPending}
        >
          {sendInternalCaseMutation.isPending ? "Sender..." : "Send besked"}
        </Button>
      </div>
    </div>
  );
} 