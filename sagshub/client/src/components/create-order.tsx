import React, { useState } from "react";
import { Customer } from "@/types";

export function CreateOrder() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
const [showCustomerSearch, setShowCustomerSearch] = useState(false);
const [customerSearchTimeout, setCustomerSearchTimeout] = useState<NodeJS.Timeout | null>(null);

const handleCustomerSearch = async (value: string) => {
  setSearchTerm(value);
  setIsSearching(true);

  if (customerSearchTimeout) {
    clearTimeout(customerSearchTimeout);
  }

  const timeout = setTimeout(async () => {
    try {
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(value)}`);
      if (!response.ok) throw new Error("Søgning fejlede");
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Fejl ved kundesøgning:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  setCustomerSearchTimeout(timeout);
};

const handleCustomerSelect = (customer: Customer) => {
  setSelectedCustomer(customer);
  setSearchTerm(customer.name);
  setShowCustomerSearch(false);
  setSearchResults([]);
};

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleCustomerSearch(e.target.value)}
        onFocus={() => setShowCustomerSearch(true)}
        placeholder="Søg efter kunde..."
        className="w-full p-2 border rounded"
      />
      {showCustomerSearch && (searchTerm.length > 0 || searchResults.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="p-2 text-gray-500">Søger...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleCustomerSelect(customer)}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {customer.name}
              </div>
            ))
          ) : (
            <div className="p-2 text-gray-500">Ingen resultater fundet</div>
          )}
        </div>
      )}
    </div>
  );
} 
