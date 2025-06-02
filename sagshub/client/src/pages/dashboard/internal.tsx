import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { useLocation } from "wouter";
import { MenuLayout } from "@/components/menu-layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, ChevronDown, Inbox, SendHorizontal, Bell } from "lucide-react";

interface InternalCase {
  id: number;
  caseId: number;
  senderId: number;
  receiverId: number;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  caseCaseNumber: string;
  senderName: string;
  receiverName: string;
  customerName: string;
}

export default function InternalCasesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tabValue, setTabValue] = useState("all");
  const [page, setPage] = useState(1);
  
  // Create the query params based on the tab selected
  const getQueryParams = () => {
    const onlySent = tabValue === "sent";
    const onlyReceived = tabValue === "received";
    const onlyUnread = tabValue === "unread";
    
    return {
      page,
      pageSize: 10,
      userId: user?.id,
      onlySent,
      onlyReceived,
      onlyUnread,
    };
  };

  const { data: internalCasesData } = useQuery({
    queryKey: ["/api/internal-cases", getQueryParams()],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
      
      const res = await apiRequest("GET", `/api/internal-cases?${searchParams.toString()}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/internal-cases/${id}/mark-as-read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/internal-cases/unread-count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewCase = (internalCase: InternalCase) => {
    setLocation(`/worker/cases/${internalCase.caseId}`);
    
    // Hvis den ikke er læst og brugeren er modtageren, så marker den som læst
    if (!internalCase.read && internalCase.receiverId === user?.id) {
      markAsReadMutation.mutate(internalCase.id);
    }
  };

  return (
    <MenuLayout>
      <div className="p-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Interne Sager</h1>
        </div>

        <Tabs defaultValue="all" value={tabValue} onValueChange={setTabValue} className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="flex items-center">
              <Inbox className="h-4 w-4 mr-2" />
              Alle
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center">
              <Inbox className="h-4 w-4 mr-2" />
              Modtaget
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center">
              <SendHorizontal className="h-4 w-4 mr-2" />
              Sendt
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Ulæste
              {internalCasesData?.items?.filter(
                (ic: InternalCase) => !ic.read && ic.receiverId === user?.id
              ).length > 0 && (
                <Badge className="ml-2 bg-red-500">
                  {
                    internalCasesData.items.filter(
                      (ic: InternalCase) => !ic.read && ic.receiverId === user?.id
                    ).length
                  }
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {renderInternalCases(internalCasesData)}
          </TabsContent>
          
          <TabsContent value="received" className="space-y-4">
            {renderInternalCases(internalCasesData)}
          </TabsContent>
          
          <TabsContent value="sent" className="space-y-4">
            {renderInternalCases(internalCasesData)}
          </TabsContent>
          
          <TabsContent value="unread" className="space-y-4">
            {renderInternalCases(internalCasesData)}
          </TabsContent>
        </Tabs>

        {internalCasesData && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Viser {internalCasesData.items.length} af {internalCasesData.total} interne sager
            </div>
            
            {internalCasesData.totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Forrige
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === internalCasesData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Næste
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MenuLayout>
  );

  function renderInternalCases(data: any) {
    if (!data) {
      return <div className="text-center py-8">Indlæser interne sager...</div>;
    }

    if (data.items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Ingen interne sager fundet
        </div>
      );
    }

    return data.items.map((internalCase: InternalCase) => (
      <Card 
        key={internalCase.id} 
        className={!internalCase.read && internalCase.receiverId === user?.id ? "border-primary" : undefined}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {!internalCase.read && internalCase.receiverId === user?.id && (
                <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
              )}
              Sag: {internalCase.caseCaseNumber} - {internalCase.customerName}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewCase(internalCase)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Vis sag
                </DropdownMenuItem>
                {!internalCase.read && internalCase.receiverId === user?.id && (
                  <DropdownMenuItem onClick={() => markAsReadMutation.mutate(internalCase.id)}>
                    <Badge className="h-4 mr-2">
                      Markér som læst
                    </Badge>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            {internalCase.senderId === user?.id ? (
              <>Til: <span className="font-medium">{internalCase.receiverName}</span></>
            ) : (
              <>Fra: <span className="font-medium">{internalCase.senderName}</span></>
            )}
            {" • "}
            {format(new Date(internalCase.createdAt), "d. MMM yyyy HH:mm", { locale: da })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap">{internalCase.message}</div>
        </CardContent>
      </Card>
    ));
  }
} 