import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { LoginData, CustomerLoginData, WorkerLoginData } from "@/types/auth";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  customerLoginMutation: UseMutationResult<SelectUser, Error, CustomerLoginData>;
  workerLoginMutation: UseMutationResult<SelectUser, Error, WorkerLoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user");
        return response.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation<SelectUser, Error, LoginData>({
    mutationFn: async (loginData) => {
      const response = await apiRequest("POST", "/api/login", loginData);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidér user query så den henter den nye bruger data
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: "Login succesfuld",
        description: "Du er nu logget ind",
      });
      // Naviger til dashboard baseret på brugertype
      if (data.isWorker) {
        setLocation("/worker");
      } else {
        setLocation("/");
      }
    },
    onError: (error) => {
      toast({
        title: "Login fejlede",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const customerLoginMutation = useMutation<SelectUser, Error, CustomerLoginData>({
    mutationFn: async (customerData) => {
      const response = await apiRequest("POST", "/api/auth/customer-login", customerData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: "Kunde login succesfuld",
        description: `Velkommen ${data.name}`,
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Kunde login fejlede",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const workerLoginMutation = useMutation<SelectUser, Error, WorkerLoginData>({
    mutationFn: async (workerData) => {
      const response = await apiRequest("POST", "/api/auth/worker-login", workerData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: "Medarbejder login succesfuld",
        description: `Velkommen ${data.name}`,
      });
      setLocation("/worker");
    },
    onError: (error) => {
      toast({
        title: "Medarbejder login fejlede",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Invalidér user query og sæt den til null
      queryClient.setQueryData(["user"], null);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: "Logout succesfuld",
        description: "Du er nu logget ud",
      });
      setLocation("/auth");
    },
    onError: (error) => {
      toast({
        title: "Logout fejlede",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Automatisk navigation baseret på bruger status
  useEffect(() => {
    if (!isLoading) {
      const currentPath = window.location.pathname;
      
      if (!user && currentPath !== "/auth") {
        // Ikke logget ind og ikke på auth siden - naviger til auth
        setLocation("/auth");
      } else if (user && currentPath === "/auth") {
        // Logget ind men på auth siden - naviger til dashboard
        if (user.isWorker) {
          setLocation("/worker");
        } else {
          setLocation("/");
        }
      }
    }
  }, [user, isLoading, setLocation]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        customerLoginMutation,
        workerLoginMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 