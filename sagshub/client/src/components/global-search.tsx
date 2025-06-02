import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: number;
  type: 'customer' | 'case' | 'rma' | 'order';
  title: string;
  subtitle: string;
  link: string;
}

interface GlobalSearchProps {
  onSearch?: (searchTerm: string) => void;
  minSearchLength?: number;
}

export function GlobalSearch({ onSearch, minSearchLength = 2 }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: searchResults, isLoading, error } = useQuery<SearchResult[]>({
    queryKey: ["globalSearch", debouncedSearch],
    queryFn: async () => {
      const trimmedSearch = debouncedSearch?.trim();
      console.log("GlobalSearch query executing:", { debouncedSearch, trimmedSearch, minSearchLength });
      
      if (!trimmedSearch || trimmedSearch.length < minSearchLength) {
        console.log("GlobalSearch: search term too short or empty");
        return [];
      }
      
      try {
        const url = `/api/search?q=${encodeURIComponent(trimmedSearch)}`;
        console.log("GlobalSearch: making request to:", url);
        const res = await apiRequest("GET", url);
        
        if (!res.ok) {
          console.error("GlobalSearch: request failed with status:", res.status);
          throw new Error(`Søgning fejlede med status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("GlobalSearch: received data:", data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Fejl under søgning:", error);
        throw new Error(error instanceof Error ? error.message : "Der opstod en uventet fejl under søgningen");
      }
    },
    enabled: debouncedSearch?.trim().length >= minSearchLength,
    onError: (error) => {
      console.error("GlobalSearch: query error:", error);
      toast({
        title: "Fejl ved søgning",
        description: error instanceof Error ? error.message : "Der opstod en fejl under søgningen",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (onSearch) {
      onSearch(searchTerm);
    }
  }, [searchTerm, onSearch]);

  // Vis automatisk resultater når der kommer data
  useEffect(() => {
    if (searchResults && searchResults.length > 0 && debouncedSearch?.trim().length >= minSearchLength) {
      setShowResults(true);
    }
  }, [searchResults, debouncedSearch, minSearchLength]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim().length >= minSearchLength) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={`Søg efter kunder, sager, RMA eller bestillinger (mindst ${minSearchLength} tegn)...`}
        value={searchTerm}
        onChange={handleSearchInputChange}
        onFocus={() => {
          if (searchTerm.trim().length >= minSearchLength) {
            setShowResults(true);
          }
        }}
        onBlur={() => setTimeout(() => setShowResults(false), 300)}
        className="pl-8"
      />
      {showResults && searchTerm.trim().length >= minSearchLength && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-white shadow-lg">
          <div className="max-h-96 overflow-auto p-2">
            {isLoading ? (
              <div className="text-sm text-gray-500 p-2">Søger...</div>
            ) : error ? (
              <div className="text-sm text-red-500 p-2">Der opstod en fejl under søgningen</div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((result: SearchResult) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="cursor-pointer rounded-lg p-2 hover:bg-gray-100"
                  onClick={() => {
                    console.log("GlobalSearch: clicking on result:", result);
                    console.log("GlobalSearch: navigating to:", result.link);
                    setLocation(result.link);
                    setShowResults(false);
                    setSearchTerm("");
                  }}
                >
                  <div className="font-medium">{result.title}</div>
                  <div className="text-sm text-gray-500">{result.subtitle}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 p-2">Ingen resultater fundet</div>
            )}
          </div>
        </div>
      )}
      {showResults && searchTerm.trim().length > 0 && searchTerm.trim().length < minSearchLength && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-white p-2 shadow-lg">
          <div className="text-sm text-gray-500">
            Indtast mindst {minSearchLength} tegn for at søge
          </div>
        </div>
      )}
    </div>
  );
} 