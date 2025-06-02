import { FC, useState } from "react";
import { useCustomerSearchQuery } from "@/queries/customers";
import { useDebounce } from "@/hooks/use-debounce";
import { Check, User, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Customer } from "@shared/schema";
import { useAuth } from "@/hooks/auth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface CustomerExportProps {
  onExport: (data: any) => void;
}

export const CustomerExport: FC<CustomerExportProps> = ({ onExport }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>();
  const [isSearching, setIsSearching] = useState(false);
  const [includeCases, setIncludeCases] = useState(true);
  const [includeOrders, setIncludeOrders] = useState(true);
  const [includeRMA, setIncludeRMA] = useState(true);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | "print">("csv");
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { data: customers = [] } = useCustomerSearchQuery(debouncedSearchTerm);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!selectedCustomerId) {
      toast({
        title: "Fejl",
        description: "Vælg venligst en kunde først",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/customers/${selectedCustomerId}/export?includeCases=${includeCases}&includeOrders=${includeOrders}&includeRMA=${includeRMA}`);
      if (!response.ok) throw new Error("Fejl ved hentning af kundedata");
      
      const data = await response.json();
      onExport({ data, format: exportFormat });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved eksport af kundedata",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download/print kundedata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Søg efter kunde</Label>
          <Command className="rounded-lg border shadow-md">
            <CommandInput
              placeholder="Søg efter kunde..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              onFocus={() => setIsSearching(true)}
            />
            {isSearching && (
              <CommandList>
                <CommandEmpty>Ingen kunder fundet</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => {
                        setSelectedCustomerId(customer.id);
                        setIsSearching(false);
                        setSearchTerm(customer.name);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {customer.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            )}
          </Command>
        </div>

        <div className="space-y-2">
          <Label>Vælg data der skal med</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cases"
                checked={includeCases}
                onCheckedChange={(checked) => setIncludeCases(checked as boolean)}
              />
              <Label htmlFor="cases">Sager</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="orders"
                checked={includeOrders}
                onCheckedChange={(checked) => setIncludeOrders(checked as boolean)}
              />
              <Label htmlFor="orders">Bestillinger</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rma"
                checked={includeRMA}
                onCheckedChange={(checked) => setIncludeRMA(checked as boolean)}
              />
              <Label htmlFor="rma">RMA</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Vælg format</Label>
          <RadioGroup
            value={exportFormat}
            onValueChange={(value) => setExportFormat(value as "csv" | "pdf" | "print")}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv">CSV</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf">PDF</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="print" id="print" />
              <Label htmlFor="print">Print</Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={handleExport}
          className="w-full"
          disabled={!selectedCustomerId}
        >
          {exportFormat === "print" ? (
            <>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download {exportFormat.toUpperCase()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}; 