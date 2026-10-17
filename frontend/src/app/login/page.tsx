"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { QueueFlowLoader, LoadingButton } from "@/components/loading";
import { normalizeApiError, NormalizedApiError, getFieldError } from "@/lib/errors";
import { InlineError } from "@/components/ui/InlineError";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuth } from "@/context/AuthContext";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<NormalizedApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuth();

  const redirectParam = searchParams.get("redirect");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);

    try {
      const res = await api.post("/auth/login", { email, password });
      const userPayload = {
        ...res.data.user,
        email: res.data.user?.email || email
      };
      login(res.data.token, userPayload);
      toast.success("Welcome back!");

      // Validate redirect against open redirect attacks
      const isSafeInternalRedirect =
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//") &&
        !redirectParam.includes(":");

      if (isSafeInternalRedirect) {
        router.replace(redirectParam);
        return;
      }

      if (res.data.user.role === "business") {
        router.replace("/dashboard");
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      const normalized = normalizeApiError(err);
      setApiError(normalized);
    } finally {
      setLoading(false);
    }
  };

  const emailFieldError = getFieldError(apiError, "email");
  const passwordFieldError = getFieldError(apiError, "password");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
              <img src="/logo_icon.svg" alt="QueueLess" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Queue<span className="text-primary">Less</span>
            </span>
          </Link>
        </div>

        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold text-foreground">Sign in to your account</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {redirectParam ? "Sign in to continue to your store booking" : "Enter your email and password to access QueueLess"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {apiError && !emailFieldError && !passwordFieldError && (
                <ErrorBanner
                  message={apiError.message}
                  onDismiss={() => setApiError(null)}
                />
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className={`bg-card pl-9 text-xs text-foreground focus:border-primary ${
                      emailFieldError ? "border-rose-500 focus:border-rose-500" : "border-border"
                    }`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-invalid={!!emailFieldError}
                  />
                </div>
                <InlineError message={emailFieldError} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-foreground block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`bg-card pl-9 pr-9 text-xs text-foreground focus:border-primary ${
                      passwordFieldError ? "border-rose-500 focus:border-rose-500" : "border-border"
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-invalid={!!passwordFieldError}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <InlineError message={passwordFieldError} />
              </div>

              <LoadingButton
                type="submit"
                loading={loading}
                loadingText="Signing In..."
                icon={<ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 shadow-sm mt-2"
              >
                Sign In
              </LoadingButton>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 text-center text-xs text-muted-foreground border-t border-border pt-4">
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"}
                className="text-primary font-semibold hover:underline"
              >
                Create one now
              </Link>
            </p>
            <Link href="/" className="hover:text-foreground transition-colors">
              Back to Home
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <QueueFlowLoader
          variant="page"
          size="md"
          message="Preparing sign in..."
          submessage="QueueLess • Fast digital queues"
        />
      }
    >
      <LoginContent />
    </Suspense>
  );
}
