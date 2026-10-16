"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  QrCode, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Users, 
  Store, 
  Smartphone, 
  CheckCircle2, 
  Sparkles,
  Ticket,
  ChevronRight,
  ExternalLink,
  MapPin,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { QueueFlowLoader, QueueCardSkeleton, HistorySkeleton } from "@/components/loading";

interface ServiceItem {
  name: string;
  duration?: number;
  price?: number;
}

interface QueueTicket {
  _id: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled" | string;
  peopleAhead: number;
  currentEstimatedWait: number;
  date?: string;
  createdAt?: string;
  selectedServices?: ServiceItem[];
  businessId?: {
    _id?: string;
    shopName?: string;
    address?: string;
    businessProfile?: {
      shopName?: string;
      address?: string;
    };
  };
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authMessage, setAuthMessage] = useState({
    message: "Connecting to QueueLess...",
    submessage: "Checking your session and active queues",
  });
  const [myQueues, setMyQueues] = useState<QueueTicket[]>([]);
  const [history, setHistory] = useState<QueueTicket[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [loadingQueues, setLoadingQueues] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      setMyQueues([]);
      setHistory([]);
      setIsCheckingAuth(false);
    };

    const handleAuthLogin = () => {
      syncAuthState();
    };

    const syncAuthState = () => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");

      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role === "business") {
            setAuthMessage({
              message: "Connecting to store counter...",
              submessage: "Redirecting to your merchant dashboard",
            });
            // Keep isCheckingAuth = true so that the loader stays visible
            // while the route transition to /dashboard completes without flashing the landing page
            router.replace("/dashboard");
            return;
          } else {
            setUser(parsedUser);
            fetchQueuesData();
            setIsCheckingAuth(false);
          }
        } catch {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setUser(null);
          setIsCheckingAuth(false);
        }
      } else {
        setUser(null);
        setIsCheckingAuth(false);
      }
    };

    window.addEventListener("auth_logout", handleAuthLogout);
    window.addEventListener("auth_login", handleAuthLogin);

    syncAuthState();

    return () => {
      window.removeEventListener("auth_logout", handleAuthLogout);
      window.removeEventListener("auth_login", handleAuthLogin);
    };
  }, [router]);

  const fetchQueuesData = async () => {
    setLoadingQueues(true);
    try {
      const [activeRes, historyRes] = await Promise.allSettled([
        api.get("/queue/my-queues"),
        api.get("/queue/history")
      ]);

      if (activeRes.status === "fulfilled" && Array.isArray(activeRes.value.data)) {
        setMyQueues(activeRes.value.data);
      }
      if (historyRes.status === "fulfilled" && Array.isArray(historyRes.value.data)) {
        setHistory(historyRes.value.data);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoadingQueues(false);
    }
  };

  // Helper to extract store name accurately from backend populated structure
  const getStoreName = (ticket: QueueTicket) => {
    return (
      ticket.businessId?.businessProfile?.shopName ||
      ticket.businessId?.shopName ||
      "QueueLess Merchant"
    );
  };

  // Helper to extract store address
  const getStoreAddress = (ticket: QueueTicket) => {
    return (
      ticket.businessId?.businessProfile?.address ||
      ticket.businessId?.address ||
      "Local Business"
    );
  };

  // ==========================================
  // INITIAL AUTH VERIFICATION STATE (Prevents Flash)
  // ==========================================
  if (isCheckingAuth) {
    return (
      <QueueFlowLoader
        variant="page"
        size="lg"
        message={authMessage.message}
        submessage={authMessage.submessage}
      />
    );
  }

  // ==========================================
  // CUSTOMER DASHBOARD VIEW (When Authenticated)
  // ==========================================
  if (user && user.role === "customer") {
    return (
      <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] pb-20">
        <Navbar />

        <main className="container mx-auto max-w-4xl px-4 pt-24">
          {/* Welcome Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ECF2FF]">
                  Welcome back, {user.name}
                </h1>
              </div>
              <p className="text-sm text-[#889DC2] mt-1">
                Monitor your live positions and manage queue reservations in real time.
              </p>
            </div>

            <Link href="/scan">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_16px_rgba(59,130,246,0.3)] flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Scan & Join Queue
              </Button>
            </Link>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#203052] mb-6">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors relative ${
                activeTab === "active"
                  ? "text-blue-400"
                  : "text-[#889DC2] hover:text-[#ECF2FF]"
              }`}
            >
              <Ticket className="w-4 h-4" />
              Active Queues ({myQueues.length})
              {activeTab === "active" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold transition-colors relative ${
                activeTab === "history"
                  ? "text-blue-400"
                  : "text-[#889DC2] hover:text-[#ECF2FF]"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Booking History ({history.length})
              {activeTab === "history" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                />
              )}
            </button>
          </div>

          {/* Active Queues Tab */}
          {activeTab === "active" ? (
            <div className="space-y-4">
              {loadingQueues ? (
                <div className="space-y-4">
                  <QueueCardSkeleton />
                  <QueueCardSkeleton />
                </div>
              ) : myQueues.length === 0 ? (
                <div className="text-center py-16 px-6 border border-dashed border-[#203052] rounded-2xl bg-[#0A1329]/60">
                  <div className="w-14 h-14 rounded-2xl bg-[#101A32] border border-[#203052] flex items-center justify-center text-blue-400 mx-auto mb-4 shadow-inner">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-[#ECF2FF] mb-1">
                    No Active Queues
                  </h3>
                  <p className="text-sm text-[#889DC2] max-w-sm mx-auto mb-6">
                    You are not currently in any lines. Scan a business QR code or enter a store identifier to join.
                  </p>
                  <Link href="/scan">
                    <Button className="bg-blue-600 hover:bg-blue-500 text-white font-medium gap-2">
                      <QrCode className="w-4 h-4" />
                      Scan QR Code to Join
                    </Button>
                  </Link>
                </div>
              ) : (
                myQueues.map((q) => {
                  const shopName = getStoreName(q);
                  const address = getStoreAddress(q);
                  const ticketNumber = q._id.slice(-4).toUpperCase();
                  const servicesList = q.selectedServices?.map((s) => s.name).join(", ");

                  return (
                    <motion.div
                      key={q._id}
                      whileHover={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                      className="rounded-2xl border border-[#203052] bg-[#101A32] p-5 sm:p-6 shadow-xl hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold">
                              Ticket #{ticketNumber}
                            </span>
                            <StatusBadge status={q.status} />
                          </div>

                          <h2 className="text-xl font-bold text-[#ECF2FF] pt-1">
                            {shopName}
                          </h2>

                          <p className="text-xs text-[#889DC2] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            {address}
                          </p>

                          {servicesList && (
                            <p className="text-xs text-[#C5D5F5] bg-[#152243] inline-block px-2.5 py-1 rounded-md border border-[#203052]">
                              Services: <span className="font-medium text-[#ECF2FF]">{servicesList}</span>
                            </p>
                          )}
                        </div>

                        {/* Live Waiting Info & Action */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-[#203052] gap-2">
                          <div className="text-left sm:text-right">
                            <div className="text-2xl font-extrabold text-[#ECF2FF]">
                              {q.peopleAhead}{" "}
                              <span className="text-xs font-medium text-[#889DC2]">
                                {q.peopleAhead === 1 ? "person ahead" : "people ahead"}
                              </span>
                            </div>
                            <div className="text-xs text-blue-400 flex items-center gap-1 mt-0.5 sm:justify-end">
                              <Clock className="w-3 h-3" />
                              ~{q.currentEstimatedWait} mins estimated
                            </div>
                          </div>

                          <Link href={`/status/${q._id}`} className="mt-2">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1">
                              Track Live Status
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          ) : (
            /* Booking History Tab */
            <div className="space-y-3">
              {loadingQueues ? (
                <HistorySkeleton count={3} />
              ) : history.length === 0 ? (
                <div className="text-center py-16 px-6 border border-dashed border-[#203052] rounded-2xl bg-[#0A1329]/60">
                  <p className="text-sm text-[#889DC2]">No past tickets on record yet.</p>
                </div>
              ) : (
                history.map((h) => {
                  const shopName = getStoreName(h);
                  const dateStr = h.date || h.createdAt;
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })
                    : "Previous Visit";
                  const servicesList = h.selectedServices?.map((s) => s.name).join(", ");

                  return (
                    <div
                      key={h._id}
                      className="p-4 rounded-xl border border-[#203052] bg-[#101A32]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-[#ECF2FF]">{shopName}</h4>
                          <span className="text-xs text-[#889DC2]">
                            (Ticket #{h._id.slice(-4).toUpperCase()})
                          </span>
                        </div>
                        <p className="text-xs text-[#889DC2]">
                          {formattedDate} {servicesList ? `• ${servicesList}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={h.status} />
                        <Link href={`/status/${h._id}`}>
                          <button
                            className="p-1.5 rounded-lg text-[#889DC2] hover:text-[#ECF2FF] hover:bg-[#152243] transition-colors"
                            title="View Ticket Details"
                            aria-label="View Ticket Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ==========================================
  // PUBLIC VISITOR LANDING PAGE
  // ==========================================
  return (
    <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] selection:bg-blue-500/30 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6">

        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-300"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Next-Gen Digital Line Management
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-[#ECF2FF]"
          >
            Skip the line. <br className="hidden sm:block" />
            <span className="text-blue-400">
              Keep your time.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-xl text-[#889DC2] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            QueueLess enables customers to join queues digitally via storefront QR codes, track live wait times, and get served without standing in line.
          </motion.p>

          {/* Clear Distinct User Journeys */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
          >
            <Link href="/scan" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-7 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-[0_0_24px_rgba(59,130,246,0.35)] font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <QrCode className="w-4 h-4" />
                Join a Queue
              </Button>
            </Link>

            <Link href="/register?role=business" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-7 border-[#203052] bg-[#101A32]/80 hover:bg-[#152243] text-[#ECF2FF] rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Store className="w-4 h-4 text-blue-400" />
                For Businesses
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-[#0A1329]/80 border-t border-b border-[#203052]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 block">
              Effortless Customer Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#ECF2FF]">
              How QueueLess Works
            </h2>
            <p className="text-sm sm:text-base text-[#889DC2] mt-2 max-w-xl mx-auto">
              A frictionless 3-step workflow connecting customers and merchant counters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-2xl border border-[#203052] bg-[#101A32] p-6 text-center shadow-lg relative">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-5 shadow-[0_0_16px_rgba(59,130,246,0.2)]">
                <QrCode className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#152243] text-[11px] font-bold text-blue-300 mb-2">
                STEP 1
              </div>
              <h3 className="text-lg font-bold text-[#ECF2FF] mb-2">
                Scan Store QR
              </h3>
              <p className="text-sm text-[#889DC2] leading-relaxed">
                Scan the merchant's dedicated QR code at the entrance or enter their 8-character store ID directly in your browser.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-[#203052] bg-[#101A32] p-6 text-center shadow-lg relative">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-5 shadow-[0_0_16px_rgba(168,85,247,0.2)]">
                <Smartphone className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#152243] text-[11px] font-bold text-purple-300 mb-2">
                STEP 2
              </div>
              <h3 className="text-lg font-bold text-[#ECF2FF] mb-2">
                Select & Join
              </h3>
              <p className="text-sm text-[#889DC2] leading-relaxed">
                Choose the services you need, see the transparent upfront estimated wait time, and secure your digital ticket.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-[#203052] bg-[#101A32] p-6 text-center shadow-lg relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                <Clock className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#152243] text-[11px] font-bold text-emerald-300 mb-2">
                STEP 3
              </div>
              <h3 className="text-lg font-bold text-[#ECF2FF] mb-2">
                Live Status & Service
              </h3>
              <p className="text-sm text-[#889DC2] leading-relaxed">
                Track how many people are ahead of you in real time. Get notified as your position approaches the counter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Value Section: Customer & Merchant Benefits */}
      <section className="py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Customer Column */}
            <div className="rounded-2xl border border-[#203052] bg-[#101A32] p-8 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                <Ticket className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-[#ECF2FF] mb-2">
                For Customers
              </h3>
              <p className="text-sm text-[#889DC2] mb-6">
                Spend your waiting time walking, working, or relaxing instead of being glued to a physical waiting room.
              </p>

              <ul className="space-y-3 text-sm text-[#C5D5F5]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <span>No native app install required; works instantly on any smartphone browser.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <span>Accurate wait calculations dynamic to each service length.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <span>Real-time ticket updates via Socket.IO live connectivity.</span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-[#203052]">
                <Link href="/scan">
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-2">
                    Join a Queue Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Merchant Column */}
            <div className="rounded-2xl border border-[#203052] bg-[#101A32] p-8 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-[#ECF2FF] mb-2">
                For Business Owners
              </h3>
              <p className="text-sm text-[#889DC2] mb-6">
                Transform chaotic physical lobbies into orderly digital lines with custom service durations and automated caller flow.
              </p>

              <ul className="space-y-3 text-sm text-[#C5D5F5]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span>Instant printable QR code kits generated for your storefront.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span>Full control over services, prices, and operating hours.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span>Live dashboard to call next customers and complete services in one click.</span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-[#203052]">
                <Link href="/register?role=business">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2">
                    Create Merchant Account
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 px-4 sm:px-6 bg-[#0A1329]/60 border-t border-[#203052]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#ECF2FF]">
              Engineered for Speed and Reliability
            </h2>
            <p className="text-sm text-[#889DC2] mt-2">
              Modern architecture designed for clinics, barbershops, retail, and service counters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-[#203052] bg-[#101A32]">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 inline-block mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#ECF2FF] mb-1">Dynamic Wait Estimation</h4>
              <p className="text-xs text-[#889DC2] leading-relaxed">
                Calculates accurate queues by summing the designated duration of selected customer services.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#203052] bg-[#101A32]">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 inline-block mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#ECF2FF] mb-1">Operating Hours Control</h4>
              <p className="text-xs text-[#889DC2] leading-relaxed">
                Merchants set custom opening/closing schedules and closed days to prevent out-of-hours registrations.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#203052] bg-[#101A32]">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 inline-block mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#ECF2FF] mb-1">WebSocket Sync</h4>
              <p className="text-xs text-[#889DC2] leading-relaxed">
                Live counter events push updates immediately without requiring customers to manually refresh the page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl text-center rounded-3xl border border-[#203052] bg-[#101A32] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#ECF2FF] mb-3">
            Ready to eliminate physical lines?
          </h2>
          <p className="text-sm sm:text-base text-[#889DC2] max-w-xl mx-auto mb-8">
            Join QueueLess today. Setup takes less than two minutes for your store.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register?role=business" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 h-12 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                Register Your Business
              </Button>
            </Link>
            <Link href="/scan" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-[#203052] bg-[#152243] hover:bg-[#1f3160] text-[#ECF2FF] font-semibold px-8 h-12">
                Join a Queue
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 bg-[#050B18] border-t border-[#203052] text-xs text-[#889DC2]">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <img src="/logo_icon.svg" alt="QueueLess" className="w-4 h-4 object-contain" />
            </div>
            <span className="font-bold text-[#ECF2FF]">QueueLess</span>
            <span>— Smart Digital Line Management</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#ECF2FF] transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-[#ECF2FF] transition-colors">
              Create Account
            </Link>
            <Link href="/scan" className="hover:text-[#ECF2FF] transition-colors">
              Scan QR
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
