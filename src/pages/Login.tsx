import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetMe, useLogin, useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/query-client";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(2, "At least 2 characters").max(20, "Max 20 characters"),
  password: z.string().min(1, "Password required"),
});

const registerSchema = z.object({
  username: z.string().min(2, "At least 2 characters").max(20, "Max 20 characters"),
  password: z.string().min(4, "At least 4 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  const { data: user } = useGetMe();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  if (user) return <Redirect to="/dashboard" />;

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (nextUser) => {
          queryClient.setQueryData(getGetMeQueryKey(), nextUser);
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Login failed",
            description: String((error as any)?.error ?? "Invalid username or password"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const onRegister = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data: { username: data.username, password: data.password } },
      {
        onSuccess: (nextUser) => {
          queryClient.setQueryData(getGetMeQueryKey(), nextUser);
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Registration failed",
            description: String((error as any)?.error ?? "Something went wrong"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setShowPassword(false);
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 rounded-xl border border-primary text-primary flex items-center justify-center font-medium text-3xl mx-auto mb-6">
            SM
          </div>
          <CardTitle className="text-4xl font-medium tracking-normal mb-2">ShotMarket</CardTitle>
          <CardDescription className="text-base font-medium text-muted-foreground">
            The Official Prediction Market
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mode tabs */}
          <div className="flex rounded-2xl border border-border bg-background p-1 gap-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                mode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                mode === "register"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Login form */}
          {mode === "login" && (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your handle..."
                          className="h-12 bg-background text-lg px-4 focus-visible:ring-primary"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-12 bg-background text-lg px-4 pr-12 focus-visible:ring-primary"
                            autoComplete="current-password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-14 text-base font-medium"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in…" : "Enter Market"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  First time logging in? Your password will be set on first login.
                </p>
              </form>
            </Form>
          )}

          {/* Register form */}
          {mode === "register" && (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Choose a handle..."
                          className="h-12 bg-background text-lg px-4 focus-visible:ring-primary"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 4 characters"
                            className="h-12 bg-background text-lg px-4 pr-12 focus-visible:ring-primary"
                            autoComplete="new-password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Repeat password"
                          className="h-12 bg-background text-lg px-4 focus-visible:ring-primary"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-14 text-base font-medium"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating account…" : "Create Account"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  New players start with $100.00 SC.
                </p>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
