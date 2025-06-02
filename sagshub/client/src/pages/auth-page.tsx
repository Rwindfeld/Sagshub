import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";

export default function AuthPage() {
  const { customerLoginMutation, workerLoginMutation, user } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    setLocation(user.isWorker ? "/worker" : "/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex items-center justify-center p-4">
        <Tabs defaultValue="customer" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customer">Kunde Login</TabsTrigger>
            <TabsTrigger value="worker">Medarbejder Login</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <Card>
              <CardHeader>
                <CardTitle>Kunde Login</CardTitle>
                <CardDescription>Log ind med dit telefonnummer og sagsnummer</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const phone = formData.get("phone") as string;
                    const caseNumber = formData.get("caseNumber") as string;

                    if (!phone || !caseNumber) {
                      toast({
                        title: "Fejl",
                        description: "Telefonnummer og sagsnummer er påkrævet",
                        variant: "destructive",
                      });
                      return;
                    }

                    customerLoginMutation.mutate({
                      phone,
                      caseNumber,
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefonnummer</Label>
                    <Input 
                      id="phone" 
                      name="phone" 
                      type="tel"
                      placeholder="f.eks. +4512345678"
                      required 
                      disabled={customerLoginMutation.isPending}
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseNumber">Sagsnummer</Label>
                    <Input
                      id="caseNumber"
                      name="caseNumber"
                      placeholder="f.eks. REP00123"
                      required
                      disabled={customerLoginMutation.isPending}
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={customerLoginMutation.isPending}
                  >
                    {customerLoginMutation.isPending ? "Logger ind..." : "Log ind"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="worker">
            <Card>
              <CardHeader>
                <CardTitle>Medarbejder Login</CardTitle>
                <CardDescription>Log ind som medarbejder</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const username = formData.get("username") as string;
                    const password = formData.get("password") as string;

                    if (!username || !password) {
                      toast({
                        title: "Fejl",
                        description: "Brugernavn og adgangskode er påkrævet",
                        variant: "destructive",
                      });
                      return;
                    }

                    workerLoginMutation.mutate({
                      username,
                      password,
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="worker-username">Medarbejder ID</Label>
                    <Input 
                      id="worker-username" 
                      name="username" 
                      required 
                      disabled={workerLoginMutation.isPending}
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-password">Adgangskode</Label>
                    <Input
                      type="password"
                      id="worker-password"
                      name="password"
                      required
                      disabled={workerLoginMutation.isPending}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={workerLoginMutation.isPending}
                  >
                    {workerLoginMutation.isPending ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        Logger ind...
                      </>
                    ) : (
                      "Log ind"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-900 text-white p-8">
        <div className="max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">TJdata</h1>
            <p className="text-xl text-gray-400">TJdata ApS (CVR: 30550269)</p>
          </div>

          <div className="space-y-6 text-gray-300">
            <div>
              <p>Ørstedsgade 8</p>
              <p>5000 Odense C</p>
              <a
                href="https://maps.google.com/?q=Ørstedsgade+8,+5000+Odense+C"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Find vej med Google Maps
              </a>
            </div>

            <div>
              <p>Tlf: 46 93 20 61</p>
              <a 
                href="mailto:salg@tjdata.dk" 
                className="text-blue-400 hover:text-blue-300"
              >
                salg@tjdata.dk
              </a>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Vores åbningstider:</p>
              <p>Mandag – Fredag: 10:00 – 17:30</p>
              <p>Første og Sidste Lørdag i en måned: 10:00 – 14:00</p>
              <p>Søndag & Helligdage: Lukket</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}