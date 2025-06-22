import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  customerLoginMutation: UseMutationResult<SelectUser, Error, CustomerLoginData>;
  workerLoginMutation: UseMutationResult<SelectUser, Error, WorkerLoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

type LoginData = {
  username: string;
  password: string;
  isWorker: boolean;
};

type CustomerLoginData = {
  phone: string;
  caseNumber: string;
};

type WorkerLoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login mislykkedes",
        description: "Forkert brugernavn eller adgangskode",
        variant: "destructive",
      });
    },
  });

  const customerLoginMutation = useMutation({
    mutationFn: async (credentials: CustomerLoginData) => {
      const res = await apiRequest("POST", "/api/auth/customer-login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Velkommen!",
        description: `Du er nu logget ind som ${user.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login mislykkedes",
        description: "Forkert telefonnummer eller sagsnummer",
        variant: "destructive",
      });
    },
  });

  const workerLoginMutation = useMutation({
    mutationFn: async (credentials: WorkerLoginData) => {
      const res = await apiRequest("POST", "/api/auth/worker-login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Velkommen!",
        description: `Du er nu logget ind som ${user.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login mislykkedes",
        description: "Forkert brugernavn eller adgangskode",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout mislykkedes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
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
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}