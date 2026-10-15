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
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const syncUser = () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    syncUser();
    setMounted(true);

    window.addEventListener("auth_login", syncUser);
    window.addEventListener("auth_logout", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("auth_login", syncUser);
      window.removeEventListener("auth_logout", syncUser);
      window.removeEventListener("storage", syncUser);
    };
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
  const isCustomer = user?.role === "customer" || (user && !isMerchant);

  return (
    <>
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full fixed top-0 left-0 bg-[#050B18]/90 backdrop-blur-xl z-40 h-16"
        aria-label="Main Navigation"
      >
        <div className="container mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/30 group-hover:border-blue-400/60 transition-colors shadow-[0_0_12px_rgba(59,130,246,0.25)]">
              <img src="/logo_icon.svg" alt="QueueLess Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#ECF2FF]">
              Queue<span className="text-blue-400">Less</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            {!mounted ? (
              // Mounting skeleton to prevent layout shift / role flash
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-20 h-8 rounded-lg bg-[#101A32]" />
                <div className="w-24 h-8 rounded-lg bg-[#101A32]" />
              </div>
            ) : !user ? (
              /* Logged-Out Visitor Navigation */
              <div className="flex items-center gap-3">
                <Link
                  href="/#how-it-works"
                  className="text-sm font-medium text-[#889DC2] hover:text-[#ECF2FF] px-3 py-2 rounded-lg transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  href="/login"
                  className={`text-sm font-medium px-3.5 py-2 rounded-lg transition-colors ${
                    pathname === "/login"
                      ? "text-[#ECF2FF] bg-[#101A32]"
                      : "text-[#889DC2] hover:text-[#ECF2FF] hover:bg-[#101A32]/60"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_16px_rgba(59,130,246,0.35)] transition-all active:scale-[0.98]"
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
                  className={`flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors ${
                    pathname === "/dashboard"
                      ? "text-blue-400 bg-blue-500/10 border border-blue-500/30 font-semibold"
                      : "text-[#C5D5F5] hover:text-[#ECF2FF] hover:bg-[#101A32]"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Business Dashboard
                </Link>

                {/* Profile Link */}
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all ${
                    pathname === "/profile"
                      ? "border-blue-500 bg-blue-500/10 text-[#ECF2FF]"
                      : "border-[#203052] bg-[#101A32]/60 hover:border-blue-400/40 text-[#C5D5F5] hover:text-white"
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-[#ECF2FF] max-w-[140px] truncate">
                    {user.name || "Profile"}
                  </span>
                </Link>
              </div>
            ) : (
              /* Customer Navigation */
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className={`flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors ${
                    pathname === "/"
                      ? "text-blue-400 bg-blue-500/10 border border-blue-500/30 font-semibold"
                      : "text-[#C5D5F5] hover:text-[#ECF2FF] hover:bg-[#101A32]"
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  My Queues
                </Link>

                <Link
                  href="/scan"
                  className={`flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors ${
                    pathname === "/scan"
                      ? "text-blue-400 bg-blue-500/10 border border-blue-500/30 font-semibold"
                      : "text-[#C5D5F5] hover:text-[#ECF2FF] hover:bg-[#101A32]"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  Scan & Join
                </Link>

                {/* Profile Link */}
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all ${
                    pathname === "/profile"
                      ? "border-blue-500 bg-blue-500/10 text-[#ECF2FF]"
                      : "border-[#203052] bg-[#101A32]/60 hover:border-blue-400/40 text-[#C5D5F5] hover:text-white"
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-[#ECF2FF] max-w-[140px] truncate">
                    {user.name || "Profile"}
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#101A32] border border-[#203052] text-[#ECF2FF] hover:bg-[#152243] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 240 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-[#0A1329] border-l border-[#203052] z-50 p-6 flex flex-col justify-between md:hidden shadow-2xl"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#203052]">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                      <img src="/logo_icon.svg" alt="QueueLess" className="w-4 h-4 object-contain" />
                    </div>
                    <span className="text-lg font-bold text-[#ECF2FF]">
                      Queue<span className="text-blue-400">Less</span>
                    </span>
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-[#889DC2] hover:text-[#ECF2FF] hover:bg-[#101A32]"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Summary if logged in */}
                {user && (
                  <div className="p-3 rounded-xl bg-[#101A32] border border-[#203052] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-semibold text-[#ECF2FF] truncate">
                        {user.name || "User"}
                      </div>
                      <div className="text-xs text-[#889DC2] truncate">{user.email}</div>
                    </div>
                  </div>
                )}

                {/* Role-Specific Navigation Links */}
                <div className="flex flex-col gap-1.5">
                  {!user ? (
                    <>
                      <Link
                        href="/"
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          pathname === "/" ? "bg-blue-500/15 text-blue-400 font-semibold" : "text-[#C5D5F5] hover:bg-[#101A32]"
                        }`}
                      >
                        Home
                      </Link>
                      <Link
                        href="/#how-it-works"
                        className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#C5D5F5] hover:bg-[#101A32] transition-colors"
                      >
                        How It Works
                      </Link>
                      <Link
                        href="/login"
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          pathname === "/login" ? "bg-blue-500/15 text-blue-400 font-semibold" : "text-[#C5D5F5] hover:bg-[#101A32]"
                        }`}
                      >
                        Sign In
                      </Link>
                    </>
                  ) : isMerchant ? (
                    <>
                      <Link
                        href="/dashboard"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          pathname === "/dashboard"
                            ? "bg-blue-500/15 text-blue-400 font-semibold"
                            : "text-[#C5D5F5] hover:bg-[#101A32]"
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-blue-400" />
                        Business Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          pathname === "/profile"
                            ? "bg-blue-500/15 text-blue-400 font-semibold"
                            : "text-[#C5D5F5] hover:bg-[#101A32]"
                        }`}
                      >
                        <UserIcon className="w-4 h-4 text-blue-400" />
                        Account & Store Settings
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          pathname === "/"
                            ? "bg-blue-500/15 text-blue-400 font-semibold"
                            : "text-[#C5D5F5] hover:bg-[#101A32]"
                        }`}
                      >
                        <Ticket className="w-4 h-4 text-blue-400" />
                        My Queues
                      </Link>
                      <Link
                        href="/scan"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          pathname === "/scan"
                            ? "bg-blue-500/15 text-blue-400 font-semibold"
                            : "text-[#C5D5F5] hover:bg-[#101A32]"
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-blue-400" />
                        Scan & Join
                      </Link>
                      <Link
                        href="/profile"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          pathname === "/profile"
                            ? "bg-blue-500/15 text-blue-400 font-semibold"
                            : "text-[#C5D5F5] hover:bg-[#101A32]"
                        }`}
                      >
                        <UserIcon className="w-4 h-4 text-blue-400" />
                        My Profile
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="pt-4 border-t border-[#203052]">
                {!user ? (
                  <Link
                    href="/register"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-[0_0_16px_rgba(59,130,246,0.35)] transition-all"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    href="/profile"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#203052] bg-[#101A32] hover:bg-[#152243] text-[#ECF2FF] text-sm font-medium transition-colors"
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
