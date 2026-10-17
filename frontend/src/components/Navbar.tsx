"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  QrCode, 
  LayoutDashboard, 
  User as UserIcon, 
  Menu, 
  X, 
  Ticket, 
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface StoredUser {
  id?: string;
  name?: string;
  email?: string;
  role?: "customer" | "business" | string;
  businessProfile?: {
    shopName?: string;
  };
}

export default function Navbar() {
  const { user, status } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const isMerchant = user?.role === "business";

  return (
    <>
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full fixed top-0 left-0 bg-background/90 backdrop-blur-xl border-b border-border z-40 h-16 transition-colors duration-150"
        aria-label="Main Navigation"
      >
        <div className="w-full max-w-[1536px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/30 group-hover:border-primary/60 transition-colors shadow-xs">
              <img src="/logo_icon.svg" alt="QueueLess Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Queue<span className="text-primary">Less</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {!mounted || status === "loading" ? (
              // Mounting skeleton to prevent layout shift / role flash
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-20 h-8 rounded-lg bg-muted" />
                <div className="w-24 h-8 rounded-lg bg-muted" />
              </div>
            ) : !user ? (
              /* Logged-Out Visitor Navigation */
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/#how-it-works"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  href="/login"
                  className={`text-sm font-medium px-3.5 py-2 rounded-lg transition-colors ${
                    pathname === "/login"
                      ? "text-foreground bg-muted font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white shadow-xs transition-all active:scale-[0.98]"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : isMerchant ? (
              /* Merchant Navigation */
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl transition-colors ${
                    pathname === "/dashboard"
                      ? "text-primary bg-primary/10 border border-primary/30 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  Business Dashboard
                </Link>

                {/* Profile Link */}
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all ${
                    pathname === "/profile"
                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                      : "border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground shadow-xs"
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold max-w-[140px] truncate">
                    {user.name || "Profile"}
                  </span>
                </Link>
              </div>
            ) : (
              /* Customer Navigation */
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className={`flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl transition-colors ${
                    pathname === "/"
                      ? "text-primary bg-primary/10 border border-primary/30 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Ticket className="w-4 h-4 text-primary" />
                  My Queues
                </Link>

                <Link
                  href="/scan"
                  className={`flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl transition-colors ${
                    pathname === "/scan"
                      ? "text-primary bg-primary/10 border border-primary/30 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <QrCode className="w-4 h-4 text-primary" />
                  Scan & Join
                </Link>

                {/* Profile Link */}
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all ${
                    pathname === "/profile"
                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                      : "border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground shadow-xs"
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold max-w-[140px] truncate">
                    {user.name || "Profile"}
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Actions */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm z-40 md:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 240 }}
              className="fixed top-0 right-0 bottom-0 w-[min(290px,85vw)] bg-card border-l border-border z-50 p-6 flex flex-col justify-between md:hidden shadow-2xl"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <img src="/logo_icon.svg" alt="QueueLess" className="w-4 h-4 object-contain" />
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      Queue<span className="text-primary">Less</span>
                    </span>
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Summary if logged in */}
                {user && (
                  <div className="p-3 rounded-xl bg-secondary border border-border flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {user.name || "User"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                  </div>
                )}

                {/* Role-Specific Navigation Links */}
                <div className="flex flex-col gap-1.5">
                  {!user ? (
                    <>
                      <Link
                        href="/"
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          pathname === "/" ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        Home
                      </Link>
                      <Link
                        href="/#how-it-works"
                        className="px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        How It Works
                      </Link>
                      <Link
                        href="/login"
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          pathname === "/login" ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        Sign In
                      </Link>
                    </>
                  ) : isMerchant ? (
                    <>
                      <Link
                        href="/dashboard"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          pathname === "/dashboard"
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-primary" />
                        Business Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          pathname === "/profile"
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <UserIcon className="w-4 h-4 text-primary" />
                        Account & Store Settings
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          pathname === "/"
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <Ticket className="w-4 h-4 text-primary" />
                        My Queues
                      </Link>
                      <Link
                        href="/scan"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          pathname === "/scan"
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-primary" />
                        Scan & Join
                      </Link>
                      <Link
                        href="/profile"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          pathname === "/profile"
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <UserIcon className="w-4 h-4 text-primary" />
                        My Profile
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="pt-4 border-t border-border flex flex-col gap-3">
                {!user ? (
                  <Link
                    href="/register"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-xs transition-all"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    href="/profile"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-sm font-medium transition-colors"
                  >
                    View Account
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
