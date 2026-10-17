"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { Store, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { QueueFlowLoader, LoadingButton } from "@/components/loading";
import { normalizeApiError, NormalizedApiError, getFieldError } from "@/lib/errors";
import { InlineError } from "@/components/ui/InlineError";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuth } from "@/context/AuthContext";

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
  const [apiError, setApiError] = useState<NormalizedApiError | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);

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
      login(res.data.token, userPayload);
      toast.success("Account created successfully!");

      const isSafeInternalRedirect =
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//") &&
        !redirectParam.includes(":");

      if (isSafeInternalRedirect) {
        router.replace(redirectParam);
        return;
      }

      if (role === "business") {
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

  const nameError = getFieldError(apiError, "name");
  const emailError = getFieldError(apiError, "email");
  const phoneError = getFieldError(apiError, "phone");
  const passwordError = getFieldError(apiError, "password");
  const businessNameError = getFieldError(apiError, "businessName");
  const addressError = getFieldError(apiError, "address");

  const hasSpecificFieldError = !!(nameError || emailError || phoneError || passwordError || businessNameError || addressError);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground py-12">
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
            <CardTitle className="text-xl font-bold text-foreground">Create your account</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Select your role to get started with QueueLess
            </CardDescription>

            {/* Role Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-xl bg-muted border border-border">
              <button
                type="button"
                onClick={() => setRole("customer")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === "customer"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Business Owner
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-3.5">
              {apiError && !hasSpecificFieldError && (
                <ErrorBanner
                  message={apiError.message}
                  onDismiss={() => setApiError(null)}
                />
              )}

              <div className="space-y-1">
                <label htmlFor="name" className="text-xs font-medium text-foreground block">
                  Full Name *
                </label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className={`bg-card text-xs text-foreground focus:border-primary ${
                    nameError ? "border-rose-500 focus:border-rose-500" : "border-border"
                  }`}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  aria-invalid={!!nameError}
                />
                <InlineError message={nameError} />
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-medium text-foreground block">
                  Email Address *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className={`bg-card text-xs text-foreground focus:border-primary ${
                    emailError ? "border-rose-500 focus:border-rose-500" : "border-border"
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  aria-invalid={!!emailError}
                />
                <InlineError message={emailError} />
              </div>

              <div className="space-y-1">
                <label htmlFor="phone" className="text-xs font-medium text-foreground block">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className={`bg-card text-xs text-foreground focus:border-primary ${
                    phoneError ? "border-rose-500 focus:border-rose-500" : "border-border"
                  }`}
                  value={formData.phone}
                  onChange={handleChange}
                  aria-invalid={!!phoneError}
                />
                <InlineError message={phoneError} />
              </div>

              {role === "business" && (
                <>
                  <div className="space-y-1">
                    <label htmlFor="businessName" className="text-xs font-medium text-foreground block">
                      Shop / Business Name *
                    </label>
                    <Input
                      id="businessName"
                      placeholder="e.g. Modern Barber & Spa"
                      className={`bg-card text-xs text-foreground focus:border-primary ${
                        businessNameError ? "border-rose-500 focus:border-rose-500" : "border-border"
                      }`}
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                      aria-invalid={!!businessNameError}
                    />
                    <InlineError message={businessNameError} />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="address" className="text-xs font-medium text-foreground block">
                      Store Address
                    </label>
                    <Input
                      id="address"
                      placeholder="124 Market St"
                      className={`bg-card text-xs text-foreground focus:border-primary ${
                        addressError ? "border-rose-500 focus:border-rose-500" : "border-border"
                      }`}
                      value={formData.address}
                      onChange={handleChange}
                      aria-invalid={!!addressError}
                    />
                    <InlineError message={addressError} />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label htmlFor="password" className="text-xs font-medium text-foreground block">
                  Password *
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    className={`bg-card pr-9 text-xs text-foreground focus:border-primary ${
                      passwordError ? "border-rose-500 focus:border-rose-500" : "border-border"
                    }`}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    aria-invalid={!!passwordError}
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
                <InlineError message={passwordError} />
              </div>

              <LoadingButton
                type="submit"
                loading={loading}
                loadingText="Creating Account..."
                icon={<ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 shadow-sm mt-2"
              >
                Sign Up as {role === "business" ? "Business" : "Customer"}
              </LoadingButton>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center text-xs text-muted-foreground border-t border-border pt-4">
            <p>
              Already have an account?{" "}
              <Link
                href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
                className="text-primary font-semibold hover:underline"
              >
                Sign In
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
