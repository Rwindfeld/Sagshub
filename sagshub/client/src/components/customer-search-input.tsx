import { FC } from "react";
import { useCustomerSearchQuery, useCustomerQuery } from "@/queries/customers";
import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Customer } from "@shared/schema";
import { useAuth } from "@/hooks/auth";
import { useToast } from "@/components/ui/use-toast";

interface CustomerSearchInputProps {
  onSelect: (customerId: number) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  selectedCustomerId?: number;
}

const CustomerSearchInput: FC<CustomerSearchInputProps> = ({
  onSelect,
  isSearching,
  setIsSearching,
  selectedCustomerId,
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: customers, isLoading, error } = useCustomerSearchQuery(debouncedSearch);
  const { data: selectedCustomer } = useCustomerQuery(selectedCustomerId || 0, {
    enabled: !!selectedCustomerId,
  });
  const { user } = useAuth();
  const { toast } = useToast();

  // Vis fejlmeddelelse hvis brugeren ikke er en worker
  if (!user?.isWorker) {
    return (
      <div className="rounded-lg border bg-red-50 p-2 text-red-600">
        Du skal være medarbejder for at søge efter kunder
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {selectedCustomer && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded border">
          <User className="h-5 w-5 text-gray-500" />
          <div>
            <div className="font-medium">{selectedCustomer.name} <span className="text-xs text-gray-400 ml-2">(ID: {selectedCustomer.id})</span></div>
            <div className="text-sm text-gray-500">
              {selectedCustomer.phone}
              {selectedCustomer.city && ` • ${selectedCustomer.city}`}
            </div>
          </div>
        </div>
      )}
      <input
        type="text"
        className="w-full rounded-lg border px-3 py-2"
        placeholder="Søg efter kunde-ID eller navn..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsSearching(true);
        }}
        onFocus={() => {
          if (search.length > 2 && customers?.length) {
            setIsSearching(true);
          }
        }}
        onBlur={() => {
          setTimeout(() => setIsSearching(false), 200);
        }}
      />
      {isSearching && search.length > 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-white shadow-lg">
          <div className="bg-white rounded-lg">
            {isLoading ? (
              <div className="p-2 text-sm text-gray-500">
                Søger...
              </div>
            ) : !customers?.length ? (
              <div className="p-2 text-sm text-gray-500">
                Ingen kunder fundet.
              </div>
            ) : (
              <div className="max-h-64 overflow-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="cursor-pointer p-2 hover:bg-gray-100"
                    onClick={() => {
                      onSelect(customer.id);
                      setSearch(customer.name);
                      setIsSearching(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{customer.name} <span className="text-xs text-gray-400 ml-2">(ID: {customer.id})</span></div>
                        <div className="text-sm text-gray-500">
                          {customer.phone}
                          {customer.city && ` • ${customer.city}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSearchInput; 