"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/api";
import { normalizeApiError, NormalizedApiError } from "@/lib/errors";
import { QueueFlowLoader } from "@/components/loading";
import { AlertCircle, RefreshCw, LogIn, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export interface UserProfile {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "business";
  businessProfile?: {
    shopName?: string;
    address?: string;
    uniqueQrCode?: string;
    workingHours?: {
      openTime?: string;
      closeTime?: string;
      closedDays?: number[];
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  status: AuthStatus;
  user: UserProfile | null;
  role: "customer" | "business" | null;
  error: NormalizedApiError | Error | null;
  retryAuth: () => Promise<void>;
  login: (token: string, user: UserProfile, redirectDestination?: string) => void;
  logout: () => void;
  updateUser: (updatedData: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<NormalizedApiError | Error | null>(null);
  const isVerifyingRef = useRef(false);

  // Authoritative session verification
  const verifySession = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (isVerifyingRef.current) return;

    const token = localStorage.getItem("token");
    const storedUserStr = localStorage.getItem("user");

    // Case 1: No token exists — definitively unauthenticated
    if (!token) {
      setUser(null);
      setError(null);
      setStatus("unauthenticated");
      return;
    }

    // Parse provisional cached user if present
    let provisionalUser: UserProfile | null = null;
    if (storedUserStr) {
      try {
        provisionalUser = JSON.parse(storedUserStr);
      } catch {
        // Invalid JSON, ignore
      }
    }

    isVerifyingRef.current = true;
    setStatus("loading");
    setError(null);

    try {
      const res = await api.get("/auth/profile");
      const profileData: UserProfile = {
        ...res.data,
        id: res.data._id || res.data.id || provisionalUser?.id,
      };

      // Successfully verified against backend
      localStorage.setItem("user", JSON.stringify(profileData));
      setUser(profileData);
      setStatus("authenticated");
      setError(null);
    } catch (err: any) {
      const normalized = err?.normalized || normalizeApiError(err);

      // Case 2: Explicit 401/403 — session invalid or expired
      if (normalized.isUnauthorized || normalized.status === 401 || normalized.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setError(null);
        setStatus("unauthenticated");
        window.dispatchEvent(new Event("auth_logout"));
      } else {
        // Case 3: Temporary network/server failure — do NOT log out silently!
        // Preserve provisional cached user in memory if available, but flag error
        if (provisionalUser) {
          setUser(provisionalUser);
        }
        setError(normalized);
        setStatus("error");
      }
    } finally {
      isVerifyingRef.current = false;
    }
  }, []);

  // Initial bootstrap verification on application mount
  useEffect(() => {
    verifySession();

    // Listen for storage changes across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        verifySession();
      }
    };

    // Listen for custom auth events dispatched within the app
    const handleAuthLogout = () => {
      setUser(null);
      setStatus("unauthenticated");
      setError(null);
    };

    const handleAuthLogin = () => {
      verifySession();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth_logout", handleAuthLogout);
    window.addEventListener("auth_login", handleAuthLogin);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth_logout", handleAuthLogout);
      window.removeEventListener("auth_login", handleAuthLogin);
    };
  }, [verifySession]);

  // Login handler
  const login = useCallback(
    (token: string, newUser: UserProfile, redirectDestination?: string) => {
      if (typeof window === "undefined") return;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
      setStatus("authenticated");
      setError(null);
      window.dispatchEvent(new Event("auth_login"));
    },
    []
  );

  // Logout handler
  const logout = useCallback(() => {
    if (typeof window === "undefined") return;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try {
      sessionStorage.removeItem("queueless_my_queues");
    } catch {}

    setUser(null);
    setStatus("unauthenticated");
    setError(null);
    window.dispatchEvent(new Event("auth_logout"));
  }, []);

  // User profile updater
  const updateUser = useCallback((updatedData: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedData };
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const role = user?.role || null;

  const value = useMemo(
    () => ({
      status,
      user,
      role,
      error,
      retryAuth: verifySession,
      login,
      logout,
      updateUser,
    }),
    [status, user, role, error, verifySession, login, logout, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>
      <AuthRouteGuard>{children}</AuthRouteGuard>
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

/**
 * AuthRouteGuard
 * 
 * Centralized, authoritative route controller that:
 * 1. Blocks rendering until initial session verification completes.
 * 2. Redirects businesses away from public routes to `/dashboard`.
 * 3. Redirects customers away from public auth routes to `/`.
 * 4. Protects `/dashboard` against unauthenticated access and customer access.
 * 5. Protects `/profile` against unauthenticated access.
 * 6. Completely eliminates screen flicker during transitions by displaying
 *    the branded QueueFlowLoader until destination is ready.
 */
function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const { status, role, error, retryAuth, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  // Classify current route
  const isPublicGuestOnly = pathname === "/login" || pathname === "/register";
  const isBusinessOnly = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isCustomerOnly = pathname === "/scan" || pathname.startsWith("/scan/");
  const isProtectedAuth = pathname === "/profile";
  const isHome = pathname === "/";

  // Perform authoritative redirection side effects
  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      if (role === "business") {
        // Authenticated business visiting public landing, login, register, or customer-only routes
        if (isHome || isPublicGuestOnly || isCustomerOnly) {
          router.replace("/dashboard");
          return;
        }
      } else if (role === "customer") {
        // Authenticated customer visiting login, register, or business dashboard
        if (isPublicGuestOnly || isBusinessOnly) {
          router.replace("/");
          return;
        }
      }
    } else if (status === "unauthenticated") {
      // Unauthenticated user trying to access protected routes
      if (isBusinessOnly) {
        router.replace("/login?redirect=/dashboard");
        return;
      }
      if (isProtectedAuth) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
    }
  }, [status, role, pathname, isHome, isPublicGuestOnly, isBusinessOnly, isProtectedAuth, router]);

  // =========================================================================
  // 1. LOADING STATE — Display single consistent branded loader
  // =========================================================================
  if (status === "loading") {
    // Show loader for any route that requires authentication resolution
    if (isHome || isPublicGuestOnly || isBusinessOnly || isProtectedAuth) {
      return (
        <QueueFlowLoader
          variant="page"
          size="lg"
          message="Connecting to QueueLess..."
          submessage="Checking your session and active queues"
        />
      );
    }
    // For standalone public views (like storefront menu /shared/[token]), render loader briefly
    return (
      <QueueFlowLoader
        variant="page"
        size="lg"
        message="Connecting to QueueLess..."
        submessage="Loading live counter and queue status"
      />
    );
  }

  // =========================================================================
  // 2. ERROR STATE — Handle temporary network/server failure without logout
  // =========================================================================
  if (status === "error") {
    if (isHome || isBusinessOnly || isProtectedAuth) {
      const handleRetry = async () => {
        setIsRetrying(true);
        try {
          await retryAuth();
        } finally {
          setIsRetrying(false);
        }
      };

      return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">
              Queue<span className="text-primary">Less</span>
            </span>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 sm:p-10 shadow-xl max-w-md w-full flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
              Unable to Verify Session
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              We couldn&apos;t connect to QueueLess to verify your active session. This may be due to a temporary network or server issue.
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                {isRetrying ? "Retrying Connection..." : "Retry Connection"}
              </Button>

              <Button
                onClick={logout}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-border"
              >
                <LogIn className="w-4 h-4 text-muted-foreground" />
                Sign In With Another Account
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  // =========================================================================
  // 3. AUTHENTICATED STATE — Guard against rendering before role redirect
  // =========================================================================
  if (status === "authenticated") {
    if (role === "business") {
      // Business must never see landing page, login, register, or customer-only routes
      if (isHome || isPublicGuestOnly || isCustomerOnly) {
        return (
          <QueueFlowLoader
            variant="page"
            size="lg"
            message="Connecting to store counter..."
            submessage="Redirecting to your merchant dashboard"
          />
        );
      }
    } else if (role === "customer") {
      // Customer must never see login, register, or business dashboard
      if (isPublicGuestOnly || isBusinessOnly) {
        return (
          <QueueFlowLoader
            variant="page"
            size="lg"
            message="Connecting to QueueLess..."
            submessage="Redirecting to your active queues"
          />
        );
      }
    }
  }

  // =========================================================================
  // 4. UNAUTHENTICATED STATE — Guard against rendering protected pages
  // =========================================================================
  if (status === "unauthenticated") {
    if (isBusinessOnly || isProtectedAuth) {
      return (
        <QueueFlowLoader
          variant="page"
          size="lg"
          message="Sign in required"
          submessage="Redirecting to authentication"
        />
      );
    }
  }

  // Safe to render requested content
  return <>{children}</>;
}
