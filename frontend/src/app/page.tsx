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
  Calendar,
  BellRing,
  Heart,
  Repeat
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { io } from "socket.io-client";
import { useToast } from "@/components/ui/Toast";
import { QueueFlowLoader, QueueCardSkeleton, HistorySkeleton } from "@/components/loading";
import { useAuth } from "@/context/AuthContext";

interface ServiceItem {
  name: string;
  duration?: number;
  price?: number;
}

interface FavoriteStore {
  _id: string;
  name?: string;
  shopName?: string;
  email?: string;
  qrCode?: string;
  uniqueQrCode?: string;
  businessProfile?: {
    shopName?: string;
    address?: string;
    uniqueQrCode?: string;
    services?: Array<{ name: string; durationMin?: number; cost?: number }>;
  };
  isOpen: boolean;
  openReason?: string;
  activeQueueCount: number;
  estimatedWait: number;
  prediction?: {
    estimatedWaitMinutes: number;
    rangeDisplay: string;
    confidenceLabel: string;
  };
}

interface QueueTicket {
  _id: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled" | string;
  peopleAhead: number;
  currentEstimatedWait: number;
  prediction?: {
    rangeDisplay?: string;
    confidenceLabel?: string;
    confidence?: string;
  };
  alert?: {
    active: boolean;
    type: "TURN_APPROACHING" | "YOUR_TURN";
    title: string;
    message: string;
  };
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
  const { user, status } = useAuth();
  const [myQueues, setMyQueues] = useState<QueueTicket[]>([]);
  const [history, setHistory] = useState<QueueTicket[]>([]);
  const [favorites, setFavorites] = useState<FavoriteStore[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "favorites" | "history">("active");
  const [loadingQueues, setLoadingQueues] = useState(false);
  const [rebookingId, setRebookingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const [isHttpReady, setIsHttpReady] = useState(false);

  // 1. Priority HTTP Fetch for Active Queues (Fastest possible paint)
  const fetchActiveQueues = async (showLoading = true) => {
    if (showLoading) setLoadingQueues(true);
    try {
      const res = await api.get("/queue/my-queues");
      if (Array.isArray(res.data)) {
        setMyQueues(res.data);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("queueless_my_queues", JSON.stringify(res.data));
          } catch {}
        }
      }
    } catch {
      // Non-blocking error handling
    } finally {
      setLoadingQueues(false);
      setIsHttpReady(true);
    }
  };

  // 2. Background HTTP Fetch for History & Favorites
  const fetchSecondaryData = async () => {
    try {
      const [historyRes, favRes] = await Promise.allSettled([
        api.get("/queue/history"),
        api.get("/queue/favorites"),
      ]);

      if (historyRes.status === "fulfilled" && Array.isArray(historyRes.value.data)) {
        setHistory(historyRes.value.data);
      }
      if (favRes.status === "fulfilled" && Array.isArray(favRes.value.data)) {
        setFavorites(favRes.value.data);
      }
    } catch {}
  };

  useEffect(() => {
    if (user && user.role === "customer") {
      // Instant Hydration from session cache (0ms perceived load)
      if (typeof window !== "undefined") {
        try {
          const cached = sessionStorage.getItem("queueless_my_queues");
          if (cached) {
            const parsedCached = JSON.parse(cached);
            if (Array.isArray(parsedCached) && parsedCached.length > 0) {
              setMyQueues(parsedCached);
            }
          }
        } catch {}
      }

      fetchActiveQueues(myQueues.length === 0);
      fetchSecondaryData();
    } else {
      setMyQueues([]);
      setHistory([]);
      setFavorites([]);
      setIsHttpReady(false);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("queueless_my_queues");
        } catch {}
      }
    }
  }, [user]);

  const handleQuickRebook = async (pastTicketId: string) => {
    setRebookingId(pastTicketId);
    try {
      const res = await api.post("/queue/quick-rebook", { pastTicketId });
      toast.success("Successfully rejoined queue!");
      router.push(`/status/${res.data._id}`);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Could not rebook. The store may be closed or you already have an active reservation."
      );
    } finally {
      setRebookingId(null);
    }
  };

  const handleRemoveFavorite = async (businessId: string) => {
    try {
      await api.post("/queue/favorites/toggle", { businessId });
      setFavorites((prev) => prev.filter((f) => f._id !== businessId));
      toast.info("Store removed from your saved list");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove saved store");
    }
  };

  // Step 2: Switch to WebSocket for live background updates ONLY after initial HTTP fetch is complete
  useEffect(() => {
    if (!user || !isHttpReady) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // Connect via polling first (<50ms connection handshake), then auto-upgrade to websocket cleanly
    const socket = io(socketUrl, {
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
      timeout: 10000,
      auth: {
        token: token || undefined,
      },
    });

    socket.on("connect", () => {
      const userId = user._id || user.id;
      if (userId) {
        socket.emit("join_user", userId);
      }
      // Subscribe to personal live queue tickets
      myQueues.forEach((q) => {
        if (q._id) socket.emit("join_queue", q._id);
      });
    });

    socket.on("customer_notification", (notif: any) => {
      // Silent background HTTP re-fetch (zero layout shift or skeleton loaders)
      fetchActiveQueues(false);

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(notif.title, {
            body: notif.message,
            icon: "/icon.svg",
          });
        } catch {}
      }
    });

    socket.on("status_updated", () => {
      fetchActiveQueues(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, isHttpReady]);

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
  if (status === "loading") {
    return null;
  }

  // ==========================================
  // CUSTOMER DASHBOARD VIEW (When Authenticated)
  // ==========================================
  if (user && user.role === "customer") {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20">
        <Navbar />

        <main className="container mx-auto max-w-4xl px-4 pt-24">
          {/* Welcome Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Welcome back, {user.name}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor your live positions and manage queue reservations in real time.
              </p>
            </div>

            <Link href="/scan">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Scan & Join Queue
              </Button>
            </Link>
          </div>

          {/* Apple Segmented Control */}
          <div className="flex justify-start mb-6 overflow-x-auto no-scrollbar">
            <div className="inline-flex p-1 rounded-2xl bg-muted/70 border border-border/60 gap-1 backdrop-blur-md">
              <button
                onClick={() => setActiveTab("active")}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "active" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeTab === "active" && (
                  <motion.div
                    layoutId="appleHomeSegment"
                    className="absolute inset-0 bg-card rounded-xl shadow-xs border border-border/40"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  Active Queues ({myQueues.length})
                </span>
              </button>

              <button
                onClick={() => setActiveTab("favorites")}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "favorites" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeTab === "favorites" && (
                  <motion.div
                    layoutId="appleHomeSegment"
                    className="absolute inset-0 bg-card rounded-xl shadow-xs border border-border/40"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Heart className={`w-4 h-4 ${activeTab === "favorites" ? "fill-rose-500 text-rose-500" : "text-rose-500"}`} />
                  Saved Stores ({favorites.length})
                </span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "history" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeTab === "history" && (
                  <motion.div
                    layoutId="appleHomeSegment"
                    className="absolute inset-0 bg-card rounded-xl shadow-xs border border-border/40"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Booking History ({history.length})
                </span>
              </button>
            </div>
          </div>

          {/* Active Queues Tab */}
          {activeTab === "active" && (
            <div className="space-y-4">
              {loadingQueues ? (
                <div className="space-y-4">
                  <QueueCardSkeleton />
                  <QueueCardSkeleton />
                </div>
              ) : myQueues.length === 0 ? (
                <div className="text-center py-16 px-6 border border-dashed border-border/80 rounded-3xl bg-card/60">
                  <div className="w-14 h-14 rounded-2xl bg-card border border-border/70 flex items-center justify-center text-primary mx-auto mb-4 shadow-xs">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1 tracking-tight">
                    No Active Queues
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    You are not currently in any lines. Scan a business QR code or enter a store identifier to join.
                  </p>
                  <Link href="/scan">
                    <Button className="bg-primary hover:bg-primary/95 text-white font-semibold gap-2 rounded-xl shadow-xs transition-transform active:scale-[0.98]">
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
                      className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs hover:border-primary/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-mono text-xs font-bold">
                              Ticket #{ticketNumber}
                            </span>
                            <StatusBadge status={q.status} />
                            {q.alert?.active && (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 shadow-sm ${
                                  q.alert.type === "YOUR_TURN"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse"
                                }`}
                              >
                                <BellRing className="w-3 h-3" />
                                {q.alert.type === "YOUR_TURN" ? "Your Turn!" : "Turn Approaching"}
                              </span>
                            )}
                          </div>

                          <h2 className="text-xl font-bold text-foreground pt-1">
                            {shopName}
                          </h2>

                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            {address}
                          </p>

                          {servicesList && (
                            <p className="text-xs text-foreground/90 bg-muted inline-block px-2.5 py-1 rounded-md border border-border">
                              Services: <span className="font-semibold text-foreground">{servicesList}</span>
                            </p>
                          )}
                        </div>

                        {/* Live Waiting Info & Action */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-border gap-2">
                          <div className="text-left sm:text-right">
                            <div className="text-2xl font-extrabold text-foreground">
                              {q.peopleAhead}{" "}
                              <span className="text-xs font-medium text-muted-foreground">
                                {q.peopleAhead === 1 ? "person ahead" : "people ahead"}
                              </span>
                            </div>
                            <div className="text-xs text-primary flex items-center gap-1 mt-0.5 sm:justify-end font-medium">
                              <Clock className="w-3 h-3" />
                              {q.prediction?.rangeDisplay ? `~${q.prediction.rangeDisplay}` : `~${q.currentEstimatedWait} mins`}
                            </div>
                          </div>

                          <Link href={`/status/${q._id}`} className="mt-2">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs flex items-center gap-1 shadow-sm">
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
          )}

          {/* Saved Stores Tab */}
          {activeTab === "favorites" && (
            <div className="space-y-4">
              {loadingQueues ? (
                <div className="space-y-4">
                  <QueueCardSkeleton />
                  <QueueCardSkeleton />
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-16 px-6 border border-dashed border-border rounded-2xl bg-card/60">
                  <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto mb-4 shadow-sm">
                    <Heart className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    No Saved Stores Yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    Tap the heart icon on any store page to save your favourite merchants for quick 1-click rebooking and live queue tracking.
                  </p>
                  <Link href="/scan">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2">
                      <QrCode className="w-4 h-4" />
                      Find Stores to Save
                    </Button>
                  </Link>
                </div>
              ) : (
                favorites.map((fav) => {
                  const shopName =
                    fav.businessProfile?.shopName || fav.name || "QueueLess Merchant";
                  const address = fav.businessProfile?.address;
                  const servicesCount = fav.businessProfile?.services?.length || 0;

                  return (
                    <motion.div
                      key={fav._id}
                      whileHover={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                      className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                                fav.isOpen
                                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  fav.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                                }`}
                              />
                              {fav.isOpen ? "Open Now" : "Closed"}
                            </span>
                            {fav.openReason && !fav.isOpen && (
                              <span className="text-[11px] text-muted-foreground">
                                ({fav.openReason})
                              </span>
                            )}
                          </div>

                          <h2 className="text-xl font-bold text-foreground pt-1">
                            {shopName}
                          </h2>

                          {address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              {address}
                            </p>
                          )}

                          {servicesCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {servicesCount} {servicesCount === 1 ? "service" : "services"} listed
                            </p>
                          )}
                        </div>

                        {/* Live Waiting Info & Action */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-border gap-3">
                          <div className="text-left sm:text-right">
                            <div className="text-xl font-extrabold text-foreground">
                              {fav.activeQueueCount}{" "}
                              <span className="text-xs font-medium text-muted-foreground">
                                in line
                              </span>
                            </div>
                            <div className="text-xs text-primary flex items-center gap-1 mt-0.5 sm:justify-end font-medium">
                              <Clock className="w-3 h-3" />
                              {fav.prediction?.rangeDisplay
                                ? `~${fav.prediction.rangeDisplay}`
                                : `~${fav.estimatedWait} mins wait`}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveFavorite(fav._id)}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-border transition-colors"
                              title="Remove from saved stores"
                              aria-label="Remove from saved stores"
                            >
                              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                            </button>

                            <Link href={`/store/${fav.uniqueQrCode || fav.qrCode || fav.businessProfile?.uniqueQrCode || fav._id}`}>
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs flex items-center gap-1.5 shadow-sm"
                              >
                                <span>Queue Up</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Booking History Tab */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {loadingQueues ? (
                <HistorySkeleton count={3} />
              ) : history.length === 0 ? (
                <div className="text-center py-16 px-6 border border-dashed border-border rounded-2xl bg-card/60">
                  <p className="text-sm text-muted-foreground">No past tickets on record yet.</p>
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
                      className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{shopName}</h4>
                          <span className="text-xs text-muted-foreground">
                            (Ticket #{h._id.slice(-4).toUpperCase()})
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formattedDate} {servicesList ? `• ${servicesList}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={h.status} />

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rebookingId === h._id}
                          onClick={() => handleQuickRebook(h._id)}
                          className="border-border hover:bg-primary/10 hover:border-primary/40 text-xs text-primary font-medium flex items-center gap-1.5 h-8 px-2.5"
                          title="Quick rebook with the same services"
                        >
                          <Repeat className={`w-3 h-3 ${rebookingId === h._id ? "animate-spin" : ""}`} />
                          {rebookingId === h._id ? "Rebooking..." : "Rebook"}
                        </Button>

                        <Link href={`/status/${h._id}`}>
                          <button
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Next-Gen Digital Line Management
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-foreground"
          >
            Skip the line. <br className="hidden sm:block" />
            <span className="text-primary">
              Keep your time.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
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
                className="w-full sm:w-auto h-12 px-7 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <QrCode className="w-4 h-4" />
                Join a Queue
              </Button>
            </Link>

            <Link href="/register?role=business" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-7 border-border bg-card hover:bg-muted text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Store className="w-4 h-4 text-primary" />
                For Businesses
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-muted/40 border-t border-b border-border">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
              Effortless Customer Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              How QueueLess Works
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl mx-auto">
              A frictionless 3-step workflow connecting customers and merchant counters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm hover:shadow-md transition-shadow relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-5 shadow-sm">
                <QrCode className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-[11px] font-bold text-primary mb-2">
                STEP 1
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Scan Store QR
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Scan the merchant's dedicated QR code at the entrance or enter their 8-character store ID directly in your browser.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm hover:shadow-md transition-shadow relative">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-5 shadow-sm">
                <Smartphone className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                STEP 2
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Select & Join
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose the services you need, see the transparent upfront estimated wait time, and secure your digital ticket.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm hover:shadow-md transition-shadow relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-5 shadow-sm">
                <Clock className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                STEP 3
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Live Status & Service
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
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
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                <Ticket className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                For Customers
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Spend your waiting time walking, working, or relaxing instead of being glued to a physical waiting room.
              </p>

              <ul className="space-y-3 text-sm text-foreground/80">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>No native app install required; works instantly on any smartphone browser.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Accurate wait calculations dynamic to each service length.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Real-time ticket updates via Socket.IO live connectivity.</span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-border">
                <Link href="/scan">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-2 shadow-sm">
                    Join a Queue Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Merchant Column */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                For Business Owners
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Transform chaotic physical lobbies into orderly digital lines with custom service durations and automated caller flow.
              </p>

              <ul className="space-y-3 text-sm text-foreground/80">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>Instant printable QR code kits generated for your storefront.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>Full control over services, prices, and operating hours.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>Live dashboard to call next customers and complete services in one click.</span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-border">
                <Link href="/register?role=business">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 shadow-sm">
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
      <section className="py-20 px-4 sm:px-6 bg-muted/40 border-t border-border">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Engineered for Speed and Reliability
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Modern architecture designed for clinics, barbershops, retail, and service counters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary inline-block mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">Dynamic Wait Estimation</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Calculates accurate queues by summing the designated duration of selected customer services.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 inline-block mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">Operating Hours Control</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Merchants set custom opening/closing schedules and closed days to prevent out-of-hours registrations.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 inline-block mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">WebSocket Sync</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Live counter events push updates immediately without requiring customers to manually refresh the page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl text-center rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-lg relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            Ready to eliminate physical lines?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8">
            Join QueueLess today. Setup takes less than two minutes for your store.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register?role=business" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 shadow-sm">
                Register Your Business
              </Button>
            </Link>
            <Link href="/scan" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-border bg-muted hover:bg-muted/80 text-foreground font-semibold px-8 h-12">
                Join a Queue
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 bg-background border-t border-border text-xs text-muted-foreground">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <img src="/logo_icon.svg" alt="QueueLess" className="w-4 h-4 object-contain" />
            </div>
            <span className="font-bold text-foreground">QueueLess</span>
            <span>— Smart Digital Line Management</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Create Account
            </Link>
            <Link href="/scan" className="hover:text-foreground transition-colors">
              Scan QR
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
