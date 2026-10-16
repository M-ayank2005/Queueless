"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { Store, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { QueueFlowLoader, LoadingButton } from "@/components/loading";

function RegisterContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "business" ? "business" : "customer";
  const redirectParam = searchParams.get("redirect");

  const [role, setRole] = useState<"customer" | "business">(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    businessName: "",
    address: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role
      };

      if (role === "business") {
        payload.businessName = formData.businessName.trim() || `${formData.name.trim()}'s Store`;
        payload.address = formData.address.trim() || "";
      }

      const res = await api.post("/auth/register", payload);
      const userPayload = {
        ...res.data.user,
        email: res.data.user?.email || formData.email.trim(),
        phone: res.data.user?.phone || formData.phone.trim()
      };
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(userPayload));

      window.dispatchEvent(new Event("auth_login"));
      toast.success("Account created successfully!");

      const isSafeInternalRedirect =
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//") &&
        !redirectParam.includes(":");

      if (isSafeInternalRedirect) {
        router.push(redirectParam);
        return;
      }

      if (role === "business") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please check your information.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050B18] p-4 text-[#ECF2FF] py-12">
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
            <CardTitle className="text-xl font-bold text-[#ECF2FF]">Create your account</CardTitle>
            <CardDescription className="text-xs text-[#889DC2]">
              Select your role to get started with QueueLess
            </CardDescription>

            {/* Role Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-xl bg-[#0A1329] border border-[#203052]">
              <button
                type="button"
                onClick={() => setRole("customer")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === "customer"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-[#889DC2] hover:text-[#ECF2FF]"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Customer
              </button>
              <button
                type="button"
                onClick={() => setRole("business")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === "business"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-[#889DC2] hover:text-[#ECF2FF]"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Business Owner
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="name" className="text-xs font-medium text-[#C5D5F5] block">
                  Full Name *
                </label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="bg-[#0A1329] border-[#203052] text-xs text-[#ECF2FF] focus:border-blue-500"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-medium text-[#C5D5F5] block">
                  Email Address *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="bg-[#0A1329] border-[#203052] text-xs text-[#ECF2FF] focus:border-blue-500"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="phone" className="text-xs font-medium text-[#C5D5F5] block">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className="bg-[#0A1329] border-[#203052] text-xs text-[#ECF2FF] focus:border-blue-500"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {role === "business" && (
                <>
                  <div className="space-y-1">
                    <label htmlFor="businessName" className="text-xs font-medium text-[#C5D5F5] block">
                      Shop / Business Name *
                    </label>
                    <Input
                      id="businessName"
                      placeholder="e.g. Modern Barber & Spa"
                      className="bg-[#0A1329] border-[#203052] text-xs text-[#ECF2FF] focus:border-blue-500"
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="address" className="text-xs font-medium text-[#C5D5F5] block">
                      Store Address
                    </label>
                    <Input
                      id="address"
                      placeholder="124 Market St"
                      className="bg-[#0A1329] border-[#203052] text-xs text-[#ECF2FF] focus:border-blue-500"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label htmlFor="password" className="text-xs font-medium text-[#C5D5F5] block">
                  Password *
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    className="bg-[#0A1329] border-[#203052] pr-9 text-xs text-[#ECF2FF] focus:border-blue-500"
                    value={formData.password}
                    onChange={handleChange}
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

              <LoadingButton
                type="submit"
                loading={loading}
                loadingText="Creating Account..."
                icon={<ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 shadow-[0_0_16px_rgba(59,130,246,0.3)] mt-2"
              >
                Sign Up as {role === "business" ? "Business" : "Customer"}
              </LoadingButton>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center text-xs text-[#889DC2] border-t border-[#203052]/60 pt-4">
            <p>
              Already have an account?{" "}
              <Link
                href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
                className="text-blue-400 font-semibold hover:underline"
              >
                Sign In
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <QueueFlowLoader
          variant="page"
          size="md"
          message="Preparing sign up..."
          submessage="QueueLess • Fast digital queues"
        />
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
