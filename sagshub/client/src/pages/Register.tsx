import { useAuth } from "@/context/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Brugernavn skal være mindst 3 tegn",
  }),
  password: z.string().min(6, {
    message: "Adgangskode skal være mindst 6 tegn",
  }),
  confirmPassword: z.string(),
  isWorker: z.boolean().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Adgangskoderne matcher ikke",
  path: ["confirmPassword"],
});

export default function Register() {
  const { loginMutation } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      isWorker: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
          isWorker: values.isWorker,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registrering mislykkedes");
      }

      // Log ind automatisk efter registrering
      await loginMutation.mutateAsync({
        username: values.username,
        password: values.password,
        isWorker: values.isWorker,
      });

      toast({
        title: "Registrering gennemført",
        description: "Du er nu logget ind",
      });
    } catch (error) {
      toast({
        title: "Registrering mislykkedes",
        description: error instanceof Error ? error.message : "Der opstod en fejl",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Opret konto</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brugernavn</FormLabel>
                    <FormControl>
                      <Input placeholder="Indtast brugernavn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adgangskode</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Indtast adgangskode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bekræft adgangskode</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Gentag adgangskode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isWorker"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Jeg er medarbejder
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loginMutation.isLoading}>
                {loginMutation.isLoading ? "Opretter..." : "Opret konto"}
              </Button>
              <div className="text-center mt-4">
                <Link href="/auth" className="text-sm text-primary hover:underline">
                  Har du allerede en konto? Log ind her
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 