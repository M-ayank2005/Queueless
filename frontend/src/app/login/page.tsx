"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const redirectParam = searchParams.get("redirect");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const userPayload = {
        ...res.data.user,
        email: res.data.user?.email || email
      };
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(userPayload));

      window.dispatchEvent(new Event("auth_login"));
      toast.success("Welcome back!");

      // Validate redirect against open redirect attacks
      const isSafeInternalRedirect =
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//") &&
        !redirectParam.includes(":");

      if (isSafeInternalRedirect) {
        router.push(redirectParam);
        return;
      }

      if (res.data.user.role === "business") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050B18] p-4 text-[#ECF2FF]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <img src="/logo_icon.svg" alt="QueueLess" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#ECF2FF]">
              Queue<span className="text-blue-400">Less</span>
            </span>
          </Link>
        </div>

        <Card className="border-[#203052] bg-[#101A32] shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold text-[#ECF2FF]">Sign in to your account</CardTitle>
            <CardDescription className="text-xs text-[#889DC2]">
              {redirectParam ? "Sign in to continue to your store booking" : "Enter your email and password to access QueueLess"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-[#C5D5F5] block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#889DC2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="bg-[#0A1329] border-[#203052] pl-9 text-xs text-[#ECF2FF] focus:border-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-[#C5D5F5] block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#889DC2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="bg-[#0A1329] border-[#203052] pl-9 pr-9 text-xs text-[#ECF2FF] focus:border-blue-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#889DC2] hover:text-[#ECF2FF] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 shadow-[0_0_16px_rgba(59,130,246,0.3)] mt-2"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
                {!loading && <ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 text-center text-xs text-[#889DC2] border-t border-[#203052]/60 pt-4">
            <p>
              Don't have an account?{" "}
              <Link
                href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"}
                className="text-blue-400 font-semibold hover:underline"
              >
                Create one now
              </Link>
            </p>
            <Link href="/" className="hover:text-[#ECF2FF] transition-colors">
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
        <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
