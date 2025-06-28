import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { CaseWithCustomer } from '@shared/schema';

interface PrintFollowupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  onSkip: () => void;
  caseData?: CaseWithCustomer;
}

export function PrintFollowupDialog({ 
  isOpen, 
  onClose, 
  onPrint, 
  onSkip, 
  caseData 
}: PrintFollowupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePrint = async () => {
    setIsLoading(true);
    try {
      await onPrint();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print følgeseddel
          </DialogTitle>
          <DialogDescription>
            Sagen er oprettet succesfuldt! 
            {caseData && (
              <span className="block mt-1 font-medium">
                Sagsnummer: {caseData.caseNumber}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground mb-6">
          Ønsker du at printe følgeseddel til kunden?
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handlePrint}
            disabled={isLoading}
            className="flex-1"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isLoading ? "Printer..." : "Ja, print følgeseddel"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isLoading}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Nej, spring over
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 