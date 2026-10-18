"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { QueueFlowLoader, LoadingButton } from "@/components/loading";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Settings, 
  Store, 
  Clock, 
  MapPin, 
  Users, 
  Phone, 
  Printer, 
  Copy, 
  Play,
  X,
  Sparkles,
  ExternalLink,
  Maximize2,
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  Zap,
  Activity,
  Flame,
  RefreshCw,
  ShieldCheck,
  MessageSquare,
  Camera,
  Keyboard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Label } from "@/components/ui/label";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import QRScanner from "@/components/QRScanner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface BusinessProfile {
  _id?: string;
  shopName?: string;
  address?: string;
  uniqueQrCode?: string;
  services?: Array<{
    _id?: string;
    name: string;
    durationMin: number;
    cost: number;
  }>;
  workingHours?: {
    openTime: string;
    closeTime: string;
    closedDays: number[];
  };
}

interface QueueItem {
  _id: string;
  customerName?: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled" | string;
  joinedAt?: string;
  updatedAt?: string;
  selectedServices: Array<{
    name: string;
    durationMin?: number;
    cost?: number;
    quantity?: number;
  }>;
  customerId?: {
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  verifiedAt?: string;
  verifiedBy?: string;
  verificationToken?: string;
}

interface AnalyticsData {
  range: string;
  summary: {
    totalCustomers: number;
    totalCompleted: number;
    totalCancelled: number;
    totalActive: number;
    completionRate: number;
    totalRevenue: number;
    avgWaitTimeMin: number;
    avgServiceDurationMin: number;
    serviceSpeedRatio: number;
  };
  dailyThroughput: Array<{
    date: string;
    label: string;
    completed: number;
    cancelled: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    label: string;
    count: number;
  }>;
  servicePopularity: Array<{
    name: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
}

export default function Dashboard() {
  const { user, status } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [newService, setNewService] = useState({ name: "", durationMin: "", cost: "" });
  const [isAddingService, setIsAddingService] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Tab & Analytics State
  const [activeTab, setActiveTab] = useState<"live" | "analytics" | "services">("live");
  const [analyticsRange, setAnalyticsRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Settings & QR Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    shopName: "",
    address: "",
    openTime: "09:00",
    closeTime: "17:00",
    closedDays: [] as number[]
  });

  // Ticket Inspection & Verification States
  const [selectedTicket, setSelectedTicket] = useState<QueueItem | null>(null);
  const [targetTicketForVerification, setTargetTicketForVerification] = useState<QueueItem | null>(null);
  const [isManualInputMode, setIsManualInputMode] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    ticket?: any;
  } | null>(null);

  const openVerifyModalForTicket = (ticket?: QueueItem | null) => {
    setTargetTicketForVerification(ticket || null);
    setIsManualInputMode(false); // Default to primary camera QR scanner
    setVerificationResult(null);
    setVerifyInput("");
    setIsVerifyModalOpen(true);
  };

  const socketRef = useRef<Socket | null>(null);

  const fetchAnalytics = async (range: string = analyticsRange) => {
    setLoadingAnalytics(true);
    try {
      const res = await api.get(`/business/analytics?range=${range}`);
      setAnalyticsData(res.data);
    } catch {
      toast.error("Failed to load business analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const activeQueue = useMemo(() => {
    return queue.filter(q => q.status === "waiting" || q.status === "in_progress");
  }, [queue]);

  const processedQueue = useMemo(() => {
    return queue
      .filter(q => q.status === "completed" || q.status === "cancelled")
      .sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.joinedAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.joinedAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [queue]);

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsQrModalOpen(false);
        setIsSettingsOpen(false);
        setIsTicketModalOpen(false);
        setIsVerifyModalOpen(false);
        setTargetTicketForVerification(null);
      }
    };
    if (isQrModalOpen || isSettingsOpen || isTicketModalOpen || isVerifyModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQrModalOpen, isSettingsOpen, isTicketModalOpen, isVerifyModalOpen]);

  useEffect(() => {
    if (status !== "authenticated" || user?.role !== "business") {
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    fetchDashboardData();

    // Setup Socket connection with authenticated merchant token (polling first, then upgrade)
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socketInstance = io(socketUrl, {
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
      timeout: 10000,
      auth: {
        token: token || undefined
      }
    });
    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      console.log("Connected to real-time counter socket");
    });

    socketInstance.on("queue_updated", () => {
      fetchQueueOnly();
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [status, user?.role]);

  // Join business room for live real-time sync
  useEffect(() => {
    if (businessProfile?._id && socketRef.current) {
      socketRef.current.emit("join_business", businessProfile._id);
    }
  }, [businessProfile]);

  const fetchDashboardData = async () => {
    try {
      const [profileRes, queueRes] = await Promise.all([
        api.get("/business/me"),
        api.get("/business/queue")
      ]);

      const profile = profileRes.data;
      setBusinessProfile(profile);
      setServices(profile.services || []);
      setQueue(queueRes.data || []);

      if (profile) {
        setSettingsForm({
          shopName: profile.shopName || "",
          address: profile.address || "",
          openTime: profile.workingHours?.openTime || "09:00",
          closeTime: profile.workingHours?.closeTime || "17:00",
          closedDays: profile.workingHours?.closedDays || []
        });
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      } else {
        toast.error("Could not load dashboard information");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueOnly = async () => {
    try {
      const queueRes = await api.get("/business/queue");
      setQueue(queueRes.data || []);
    } catch {
      // Background sync error - non blocking
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name.trim() || !newService.durationMin || !newService.cost) {
      toast.error("Please fill in service name, duration, and price");
      return;
    }

    setIsAddingService(true);
    const updatedServices = [
      ...services,
      {
        name: newService.name.trim(),
        durationMin: Math.max(1, Number(newService.durationMin)),
        cost: Math.max(0, Number(newService.cost))
      }
    ];

    try {
      const res = await api.put("/business/services", { services: updatedServices });
      setServices(res.data.services || updatedServices);
      setNewService({ name: "", durationMin: "", cost: "" });
      toast.success("New service added successfully!");
    } catch {
      toast.error("Failed to add service");
    } finally {
      setIsAddingService(false);
    }
  };

  const handleRemoveService = async (index: number) => {
    const updatedServices = services.filter((_, idx) => idx !== index);
    try {
      const res = await api.put("/business/services", { services: updatedServices });
      setServices(res.data.services || updatedServices);
      toast.info("Service removed");
    } catch {
      toast.error("Failed to delete service");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/business/queue/${id}/status`, { status: newStatus });
      await fetchQueueOnly();
      if (newStatus === "in_progress") toast.info("Customer called to counter");
      if (newStatus === "completed") toast.success("Service marked as completed!");
      if (newStatus === "cancelled") toast.info("Ticket cancelled");
    } catch {
      toast.error("Failed to update queue ticket");
    }
  };

  const handleVerifyTicket = async (ticketIdOrToken: string) => {
    if (!ticketIdOrToken.trim()) {
      toast.error("Please enter a ticket ID, code, or token");
      return;
    }
    setIsVerifying(true);
    try {
      const cleanInput = ticketIdOrToken.trim();
      const payload: { ticketId?: string; token?: string } = {
        token: cleanInput
      };
      if (targetTicketForVerification) {
        payload.ticketId = targetTicketForVerification._id;
      } else {
        payload.ticketId = cleanInput;
      }

      const res = await api.post("/business/queue/verify", payload);
      const verifiedTicket = res.data.ticket;

      setVerificationResult({
        success: true,
        message: res.data.message || "Customer verified successfully",
        ticket: verifiedTicket
      });
      toast.success("Customer ticket verified at counter!");
      await fetchQueueOnly();

      if (selectedTicket && verifiedTicket && selectedTicket._id === verifiedTicket._id) {
        setSelectedTicket(verifiedTicket);
      }
      if (targetTicketForVerification && verifiedTicket && targetTicketForVerification._id === verifiedTicket._id) {
        setTargetTicketForVerification(verifiedTicket);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to verify customer ticket";
      setVerificationResult({
        success: false,
        message: msg
      });
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScanFromCamera = async (decodedText: string) => {
    if (!decodedText || isVerifying) return;
    await handleVerifyTicket(decodedText);
  };

  const handleVerifySelectedTicket = async () => {
    if (!selectedTicket) return;
    setIsVerifying(true);
    try {
      const res = await api.post("/business/queue/verify", {
        ticketId: selectedTicket._id,
        token: selectedTicket.verificationToken || selectedTicket._id
      });
      toast.success("Ticket verified successfully!");
      setSelectedTicket(res.data.ticket);
      await fetchQueueOnly();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to verify ticket");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const payload = {
        shopName: settingsForm.shopName.trim(),
        address: settingsForm.address.trim(),
        workingHours: {
          openTime: settingsForm.openTime,
          closeTime: settingsForm.closeTime,
          closedDays: settingsForm.closedDays
        }
      };

      const res = await api.put("/business/settings", payload);
      setBusinessProfile(prev => ({ ...prev, ...res.data }));
      setIsSettingsOpen(false);
      toast.success("Store settings updated successfully!");
    } catch {
      toast.error("Failed to update store settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const toggleClosedDay = (dayIndex: number) => {
    setSettingsForm(prev => {
      const exists = prev.closedDays.includes(dayIndex);
      return {
        ...prev,
        closedDays: exists
          ? prev.closedDays.filter(d => d !== dayIndex)
          : [...prev.closedDays, dayIndex]
      };
    });
  };

  const handleCopyStoreLink = () => {
    if (!businessProfile?.uniqueQrCode) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const storeUrl = `${origin}/store/${businessProfile.uniqueQrCode}`;
    navigator.clipboard.writeText(storeUrl);
    toast.success("Store URL copied to clipboard!");
  };

  const handlePrintQR = () => {
    if (!businessProfile?.uniqueQrCode) return;
    const qrSvgElement = document.getElementById("enlarged-store-qr-code-svg") || document.getElementById("store-qr-code-svg");
    if (!qrSvgElement) {
      toast.error("QR Code graphic not found");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Could not open print window. Please allow popups.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scan to Join Queue - ${businessProfile.shopName || "QueueLess"}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 40px;
              background: #fff;
              color: #111;
            }
            .card {
              border: 3px solid #111;
              padding: 40px;
              border-radius: 24px;
              display: inline-block;
              max-width: 420px;
              margin: 0 auto;
            }
            h1 {
              font-size: 28px;
              margin: 0 0 8px 0;
            }
            .subtitle {
              font-size: 16px;
              color: #555;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              margin: 24px 0;
              display: flex;
              justify-content: center;
            }
            .qr-wrapper svg {
              width: 220px;
              height: 220px;
            }
            .instruction {
              font-size: 15px;
              font-weight: 600;
              color: #2563eb;
              margin-bottom: 8px;
            }
            .subtext {
              font-size: 13px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${businessProfile.shopName || "QueueLess Store"}</h1>
            <div class="subtitle">${businessProfile.address || "Digital Queue Counter"}</div>
            <div class="qr-wrapper">
              ${qrSvgElement.outerHTML}
            </div>
            <div class="instruction">Scan with any smartphone camera</div>
            <div class="subtext">No app install required • View live wait time & join line</div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 400);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading || status !== "authenticated" || user?.role !== "business") {
    return (
      <QueueFlowLoader
        variant="page"
        size="lg"
        message="Connecting to QueueLess..."
        submessage="Loading live counter and queue status"
      />
    );
  }

  const activeQueueCount = activeQueue.length;
  const storeOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const storeUrl = `${storeOrigin}/store/${businessProfile?.uniqueQrCode || ""}`;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />

      <main className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* Dashboard Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {businessProfile?.shopName || "Store Dashboard"}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Store Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              {businessProfile?.address || "Address not provided"}
              <span className="text-border mx-1">•</span>
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              {businessProfile?.workingHours?.openTime && businessProfile?.workingHours?.closeTime
                ? `${businessProfile.workingHours.openTime} - ${businessProfile.workingHours.closeTime}`
                : "24/7 Service"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="outline"
              className="border-border bg-card hover:bg-muted text-foreground flex items-center gap-2 shadow-sm"
            >
              <Settings className="w-4 h-4 text-primary" />
              Store Settings
            </Button>
          </div>
        </div>

        {/* Apple Segmented Control */}
        <div className="inline-flex p-1 rounded-2xl bg-muted/80 border border-border/60 mb-8 backdrop-blur-md shadow-xs overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("live")}
            className={`relative flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 rounded-xl cursor-pointer ${
              activeTab === "live"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === "live" && (
              <motion.div
                layoutId="appleDashboardSegment"
                className="absolute inset-0 bg-card rounded-xl shadow-xs border border-border/50"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Live Counter ({activeQueueCount})
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("analytics");
              if (!analyticsData) fetchAnalytics(analyticsRange);
            }}
            className={`relative flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 rounded-xl cursor-pointer ${
              activeTab === "analytics"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === "analytics" && (
              <motion.div
                layoutId="appleDashboardSegment"
                className="absolute inset-0 bg-card rounded-xl shadow-xs border border-border/50"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Analytics & Insights
            </span>
          </button>

          <button
            onClick={() => setActiveTab("services")}
            className={`relative flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 rounded-xl cursor-pointer ${
              activeTab === "services"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === "services" && (
              <motion.div
                layoutId="appleDashboardSegment"
                className="absolute inset-0 bg-card rounded-xl shadow-xs border border-border/50"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              Service Catalog ({services.length})
            </span>
          </button>
        </div>

        {/* Dashboard Responsive Grid */}
        {activeTab === "live" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Live Queue (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-card border-border shadow-md">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground">
                        Current Customer Queue
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Real-time visitor flow and counter caller.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openVerifyModalForTicket(null)}
                      className="border-primary/30 hover:bg-primary/10 text-primary text-xs flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify Ticket
                    </Button>
                    <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                      {activeQueueCount} In Line
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-3">
                {activeQueue.length === 0 ? (
                  <div className="text-center py-16 px-4 border border-dashed border-border rounded-xl bg-card/50">
                    <Users className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      No Customers in Line
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Your queue is currently clear. Display your storefront QR code for walk-ins to scan and join.
                    </p>
                  </div>
                ) : (
                  activeQueue.map((item) => {
                    const customerName = item.customerId?.name || item.customerName || "Customer";
                    const customerPhone = item.customerId?.phone;
                    const ticketNumber = item._id.slice(-4).toUpperCase();
                    const servicesString = item.selectedServices?.map(s => `${s.name}${s.quantity && s.quantity > 1 ? ` (×${s.quantity})` : ""}`).join(", ");
                    const isWaiting = item.status === "waiting";
                    const isInProgress = item.status === "in_progress";
                    const isVerified = Boolean(item.verifiedAt);

                    return (
                      <motion.div
                        key={item._id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          setSelectedTicket(item);
                          setIsTicketModalOpen(true);
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/50 hover:shadow-md ${
                          isInProgress
                            ? "bg-primary/10 border-primary/40 shadow-sm"
                            : "bg-card border-border"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
                                #{ticketNumber}
                              </span>
                              <h3 className="font-bold text-base text-foreground">
                                {customerName}
                              </h3>
                              <StatusBadge status={item.status} />
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </span>
                              )}
                            </div>

                            {customerPhone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3 text-primary" />
                                {customerPhone}
                              </p>
                            )}

                            {servicesString && (
                              <p className="text-xs text-foreground/80 pt-0.5">
                                <span className="text-muted-foreground">Services:</span> {servicesString}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons for active tickets */}
                          <div 
                            className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isWaiting && (
                              <>
                                {!isVerified && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openVerifyModalForTicket(item);
                                    }}
                                    className="border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                                    title="Scan Customer Ticket QR"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    Scan QR
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(item._id, "in_progress");
                                  }}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  Call Customer
                                </Button>
                              </>
                            )}

                            {isInProgress && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(item._id, "completed");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Complete
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(item._id, "cancelled");
                              }}
                              className="border-red-500/30 hover:bg-red-500/10 text-red-500 dark:text-red-400 text-xs flex items-center gap-1"
                              title="Cancel Ticket"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Processed Customers Card (Max 10, Most Recent on Top) */}
            <Card className="bg-card border-border shadow-md">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground">
                        Processed Customers
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Recently served or resolved customers (most recent 10).
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    {processedQueue.length} Recent
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-3">
                {processedQueue.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-border rounded-xl bg-card/50">
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      No Processed Customers Yet
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Customers who are marked completed or cancelled will appear here in reverse chronological order.
                    </p>
                  </div>
                ) : (
                  processedQueue.map((item) => {
                    const customerName = item.customerId?.name || item.customerName || "Customer";
                    const customerPhone = item.customerId?.phone;
                    const ticketNumber = item._id.slice(-4).toUpperCase();
                    const servicesString = item.selectedServices?.map(s => `${s.name}${s.quantity && s.quantity > 1 ? ` (×${s.quantity})` : ""}`).join(", ");
                    const processedTimestamp = item.updatedAt || item.joinedAt;
                    const processedTimeStr = processedTimestamp
                      ? new Date(processedTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";
                    const isVerified = Boolean(item.verifiedAt);

                    return (
                      <div
                        key={item._id}
                        onClick={() => {
                          setSelectedTicket(item);
                          setIsTicketModalOpen(true);
                        }}
                        className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
                                #{ticketNumber}
                              </span>
                              <h3 className="font-bold text-sm text-foreground">
                                {customerName}
                              </h3>
                              <StatusBadge status={item.status} />
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </span>
                              )}
                            </div>

                            {customerPhone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3 text-primary" />
                                {customerPhone}
                              </p>
                            )}

                            {servicesString && (
                              <p className="text-xs text-foreground/80 pt-0.5">
                                <span className="text-muted-foreground">Services:</span> {servicesString}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground sm:self-center">
                            {processedTimeStr && (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted border border-border">
                                <Clock className="w-3 h-3 text-primary" />
                                {processedTimeStr}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Store QR (TOP) & Services (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Store QR Display Card - Prominently at Top */}
            <Card className="bg-card border-border shadow-sm text-center">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold text-card-foreground flex items-center justify-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  Storefront QR Code
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Customers scan this to open your store menu and book tickets.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 flex flex-col items-center">
                {/* Clickable QR Code Container with designated ID and zoom hover hint */}
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="group relative bg-white p-3.5 rounded-2xl shadow-md inline-block mb-2 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-transparent hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Click to view enlarged QR code"
                >
                  {businessProfile?.uniqueQrCode ? (
                    <QRCode
                      id="store-qr-code-svg"
                      value={storeUrl}
                      size={150}
                      level="H"
                    />
                  ) : (
                    <div className="w-[150px] h-[150px] flex items-center justify-center text-xs text-black font-semibold">
                      Generating...
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/55 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-semibold text-xs gap-1 backdrop-blur-[1px]">
                    <Maximize2 className="w-5 h-5 text-primary" />
                    <span>Enlarge QR</span>
                  </div>
                </button>

                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mb-3">
                  <Maximize2 className="w-3 h-3 text-primary" />
                  <span>Click QR code to view enlarged</span>
                </p>

                <div className="w-full max-w-xs space-y-2 mb-4">
                  <p className="text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border truncate">
                    Code: {businessProfile?.uniqueQrCode || "..."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    onClick={handleCopyStoreLink}
                    variant="outline"
                    className="text-xs flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-primary" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={handlePrintQR}
                    className="text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Sign
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Services Management Card - Located below QR */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold text-card-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Offered Services
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Customers select from these when scanning your QR.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Services List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {services.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No services added yet. Add at least one below.
                    </p>
                  ) : (
                    services.map((service, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-sm"
                      >
                        <div>
                          <div className="font-semibold text-foreground text-xs sm:text-sm">
                            {service.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {service.durationMin} mins • ${service.cost}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveService(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          aria-label={`Remove service ${service.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Service Inline Form */}
                <form onSubmit={handleAddService} className="pt-3 border-t border-border space-y-2">
                  <Input
                    placeholder="Service Name (e.g. Haircut)"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    className="bg-background border-border text-xs text-foreground"
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Duration (mins)"
                      value={newService.durationMin}
                      onChange={(e) => setNewService({ ...newService, durationMin: e.target.value })}
                      className="bg-background border-border text-xs text-foreground"
                      min="1"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Price ($)"
                      value={newService.cost}
                      onChange={(e) => setNewService({ ...newService, cost: e.target.value })}
                      className="bg-background border-border text-xs text-foreground"
                      min="0"
                      required
                    />
                  </div>

                  <LoadingButton
                    type="submit"
                    loading={isAddingService}
                    loadingText="Adding Service..."
                    icon={<Plus className="w-4 h-4" />}
                    className="w-full text-xs font-semibold"
                  >
                    Add Service
                  </LoadingButton>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Tab 2: Analytics & Operational Intelligence View */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Counter Intelligence & Operational Analytics
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time aggregation from completed tickets, service durations, and customer throughput.
                </p>
              </div>

              {/* Time Range Selector & Refresh */}
              <div className="flex items-center gap-2">
                <div className="flex p-1 bg-muted/50 border border-border rounded-xl text-xs font-semibold">
                  {(["today", "7d", "30d", "all"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setAnalyticsRange(r);
                        fetchAnalytics(r);
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        analyticsRange === r
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => fetchAnalytics(analyticsRange)}
                  disabled={loadingAnalytics}
                  className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Refresh analytics data"
                  aria-label="Refresh analytics data"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingAnalytics ? "animate-spin text-emerald-500" : ""}`} />
                </button>
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="py-20 flex justify-center items-center">
                <QueueFlowLoader
                  variant="card"
                  size="md"
                  message="Aggregating operational intelligence..."
                  submessage="Calculating service speeds, wait times, and throughput"
                />
              </div>
            ) : !analyticsData ? (
              <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl bg-muted/30">
                <p className="text-sm text-muted-foreground">Unable to load analytics data at this time.</p>
              </div>
            ) : (
              <>
                {/* 4 Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-card border-border p-5 shadow-sm hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Completed Customers</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-extrabold text-foreground">
                      {analyticsData.summary.totalCompleted}
                      <span className="text-xs font-medium text-muted-foreground ml-2">served</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {analyticsData.summary.completionRate}% completion
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {analyticsData.summary.totalCancelled} cancelled
                      </span>
                    </div>
                  </Card>

                  <Card className="bg-card border-border p-5 shadow-sm hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Estimated Revenue</span>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-extrabold text-foreground">
                      ${analyticsData.summary.totalRevenue.toLocaleString()}
                    </div>
                    <p className="mt-2.5 text-[11px] text-muted-foreground">
                      From {analyticsData.summary.totalCompleted} completed service orders
                    </p>
                  </Card>

                  <Card className="bg-card border-border p-5 shadow-sm hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Avg Customer Wait</span>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-extrabold text-foreground">
                      ~{analyticsData.summary.avgWaitTimeMin} mins
                    </div>
                    <p className="mt-2.5 text-[11px] text-muted-foreground">
                      Mean wait before being called to counter
                    </p>
                  </Card>

                  <Card className="bg-card border-border p-5 shadow-sm hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Avg Service Duration</span>
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Zap className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-extrabold text-foreground">
                      ~{analyticsData.summary.avgServiceDurationMin} mins
                    </div>
                    <div className="mt-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                          analyticsData.summary.serviceSpeedRatio <= 1.0
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        <Activity className="w-3 h-3" />
                        {analyticsData.summary.serviceSpeedRatio <= 1.0
                          ? `${Math.round((1 - analyticsData.summary.serviceSpeedRatio) * 100)}% Faster than catalog`
                          : `${Math.round((analyticsData.summary.serviceSpeedRatio - 1) * 100)}% Slower than catalog`}
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Daily Volume Throughput Chart */}
                <Card className="bg-card border-border shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Daily Customer Volume Throughput
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Breakdown of completed customers, cancellations, and daily revenue.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-500/80 inline-block" />
                        <span>Cancelled</span>
                      </div>
                    </div>
                  </div>

                  {analyticsData.dailyThroughput.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-10">No daily ticket records in this time period.</p>
                  ) : (
                    <div className="pt-4">
                      {/* Responsive Visual Bar Chart */}
                      {(() => {
                        const maxVol = Math.max(
                          ...analyticsData.dailyThroughput.map((d) => d.completed + d.cancelled),
                          5
                        );

                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-7 sm:grid-cols-7 lg:grid-cols-7 gap-2 sm:gap-4 items-end h-48 border-b border-border pb-2">
                              {analyticsData.dailyThroughput.map((day, idx) => {
                                const total = day.completed + day.cancelled;
                                const completedPct = Math.round((day.completed / maxVol) * 100);
                                const cancelledPct = Math.round((day.cancelled / maxVol) * 100);

                                return (
                                  <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                                    {/* Tooltip on hover */}
                                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-popover border border-border text-[10px] text-popover-foreground px-2 py-1 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                                      <span className="font-bold">{day.label}</span>
                                      <span className="text-emerald-600 dark:text-emerald-400">{day.completed} completed (${day.revenue})</span>
                                      {day.cancelled > 0 && <span className="text-rose-500">{day.cancelled} cancelled</span>}
                                    </div>

                                    {/* Stacked bar */}
                                    <div className="w-full max-w-[42px] bg-muted/40 rounded-t-lg overflow-hidden flex flex-col justify-end border border-border/80 h-full">
                                      {cancelledPct > 0 && (
                                        <div
                                          style={{ height: `${cancelledPct}%` }}
                                          className="bg-rose-500/80 w-full transition-all"
                                        />
                                      )}
                                      <div
                                        style={{ height: `${Math.max(completedPct, total > 0 ? 6 : 0)}%` }}
                                        className="bg-emerald-500 w-full transition-all"
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-foreground mt-1.5">{total}</span>
                                    <span className="text-[10px] text-muted-foreground truncate max-w-full">{day.label.slice(0, 3)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </Card>

                {/* Two-Column Breakdown: Peak Hours & Service Popularity */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column (7 cols): Peak Hours Heatmap / Bars */}
                  <div className="lg:col-span-7">
                    <Card className="bg-card border-border shadow-sm p-6 h-full">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Counter Peak Hours
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Customer arrival density throughout the business day.
                          </p>
                        </div>

                        {(() => {
                          const peak = [...analyticsData.peakHours].sort((a, b) => b.count - a.count)[0];
                          if (peak && peak.count > 0) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                                Peak: {peak.label} ({peak.count})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="space-y-2 pt-2 max-h-96 overflow-y-auto pr-1">
                        {(() => {
                          const maxCount = Math.max(...analyticsData.peakHours.map((h) => h.count), 1);
                          const hoursToShow = analyticsData.peakHours.filter(
                            (h) => (h.hour >= 7 && h.hour <= 22) || h.count > 0
                          );

                          return hoursToShow.map((hourItem) => {
                            const pct = Math.round((hourItem.count / maxCount) * 100);
                            const isPeak = hourItem.count === maxCount && hourItem.count > 0;

                            return (
                              <div key={hourItem.hour} className="flex items-center gap-3 text-xs">
                                <span className="w-14 text-muted-foreground font-mono text-[11px] shrink-0">
                                  {hourItem.label}
                                </span>
                                <div className="flex-1 h-5 bg-muted/40 rounded-md overflow-hidden border border-border p-0.5">
                                  <div
                                    style={{ width: `${Math.max(pct, hourItem.count > 0 ? 8 : 0)}%` }}
                                    className={`h-full rounded transition-all ${
                                      isPeak
                                        ? "bg-amber-500"
                                        : "bg-primary/80"
                                    }`}
                                  />
                                </div>
                                <span className={`w-8 text-right font-bold text-[11px] ${isPeak ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                                  {hourItem.count}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </Card>
                  </div>

                  {/* Right Column (5 cols): Service Popularity Distribution */}
                  <div className="lg:col-span-5">
                    <Card className="bg-card border-border shadow-sm p-6 h-full">
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          Service Popularity Distribution
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Most requested catalog offerings by volume and revenue.
                        </p>
                      </div>

                      {analyticsData.servicePopularity.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-10">
                          No service bookings on record for this period.
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          {analyticsData.servicePopularity.map((service, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border text-xs">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold text-[10px] flex items-center justify-center">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-semibold text-foreground text-sm">
                                    {service.name}
                                  </span>
                                </div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ${service.revenue}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                                <span>{service.count} {service.count === 1 ? "booking" : "bookings"}</span>
                                <span>{service.percentage}% of volume</span>
                              </div>

                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${service.percentage}%` }}
                                  className="h-full bg-primary rounded-full"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Dedicated Service Catalog Management View */}
        {activeTab === "services" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Service Catalog & Pricing
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Manage the services, estimated turnaround times, and prices displayed to customers.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-5 space-y-6">
                <div className="space-y-3">
                  {services.length === 0 ? (
                    <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-muted/30">
                      <Store className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">No Services Configured</p>
                      <p className="text-xs text-muted-foreground">Add services below so customers can select what they need.</p>
                    </div>
                  ) : (
                    services.map((service, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border shadow-sm"
                      >
                        <div>
                          <div className="font-semibold text-sm text-foreground">{service.name}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              {service.durationMin} mins
                            </span>
                            <span>•</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">${service.cost}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveService(idx)}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          aria-label={`Remove service ${service.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Service Form */}
                <form onSubmit={handleAddService} className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Service</h4>
                  <Input
                    placeholder="Service Name (e.g. Deluxe Beard Trim)"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    className="bg-background border-border text-xs text-foreground"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="Duration (Minutes)"
                      value={newService.durationMin}
                      onChange={(e) => setNewService({ ...newService, durationMin: e.target.value })}
                      className="bg-background border-border text-xs text-foreground"
                      min="1"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Price ($)"
                      value={newService.cost}
                      onChange={(e) => setNewService({ ...newService, cost: e.target.value })}
                      className="bg-background border-border text-xs text-foreground"
                      min="0"
                      required
                    />
                  </div>
                  <LoadingButton
                    type="submit"
                    loading={isAddingService}
                    loadingText="Adding Service..."
                    icon={<Plus className="w-4 h-4" />}
                    className="w-full text-xs font-semibold"
                  >
                    Add Service to Catalog
                  </LoadingButton>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Store Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            key="settings-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 transform-gpu"
          >
            <div
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              key="settings-modal-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative z-50 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl transform-gpu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-dialog-title"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 id="settings-dialog-title" className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Store Configuration
                </h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="shop-name" className="text-xs text-foreground font-medium">
                    Store / Shop Name *
                  </Label>
                  <Input
                    id="shop-name"
                    value={settingsForm.shopName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                    className="bg-background border-border text-foreground"
                    placeholder="e.g. Modern Barber & Spa"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="shop-address" className="text-xs text-foreground font-medium">
                    Store Address / Location
                  </Label>
                  <Input
                    id="shop-address"
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    className="bg-background border-border text-foreground"
                    placeholder="e.g. 124 Market Street, Suite 400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="open-time" className="text-xs text-foreground font-medium">
                      Opening Time
                    </Label>
                    <Input
                      id="open-time"
                      type="time"
                      value={settingsForm.openTime}
                      onChange={(e) => setSettingsForm({ ...settingsForm, openTime: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="close-time" className="text-xs text-foreground font-medium">
                      Closing Time
                    </Label>
                    <Input
                      id="close-time"
                      type="time"
                      value={settingsForm.closeTime}
                      onChange={(e) => setSettingsForm({ ...settingsForm, closeTime: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs text-foreground font-medium">
                    Closed Days (Check days when store is closed)
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DAYS.map((dayName, idx) => {
                      const isChecked = settingsForm.closedDays.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleClosedDay(idx)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                            isChecked
                              ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300"
                              : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {dayName.slice(0, 3)} {isChecked ? "✗" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    type="submit"
                    loading={isSavingSettings}
                    loadingText="Saving Settings..."
                    className="min-w-[140px]"
                  >
                    Save Settings
                  </LoadingButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enlarged QR Code Centered Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <motion.div
            key="qr-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 transform-gpu"
          >
            {/* Dimmed backdrop with fade animation */}
            <div
              onClick={() => setIsQrModalOpen(false)}
              className="fixed inset-0 bg-black/70 dark:bg-black/85 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Centered Modal Window with spring popup animation - Landscape Layout on Web */}
            <motion.div
              key="qr-modal-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative z-50 w-full max-w-3xl lg:max-w-4xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl transform-gpu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="enlarged-qr-title"
            >
              {/* Cross / Close button to minimize/close */}
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close enlarged QR modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Landscape 2-Column Content Layout */}
              <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 sm:gap-8">
                {/* Left Column: QR Code Display Frame */}
                <div className="w-full md:w-auto flex flex-col items-center justify-center p-6 sm:p-8 bg-muted/30 border border-border rounded-2xl shrink-0">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xl border-4 border-primary/25">
                    <QRCode
                      id="enlarged-store-qr-code-svg"
                      value={storeUrl}
                      size={240}
                      level="H"
                    />
                  </div>
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Scan with any smartphone camera</span>
                  </div>
                </div>

                {/* Right Column: Store Info, Code & Actions */}
                <div className="flex-1 flex flex-col justify-between text-left w-full py-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 border border-primary/25 text-primary">
                        <QrCode className="w-3 h-3" />
                        Storefront Counter Poster
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    </div>

                    <h2 id="enlarged-qr-title" className="text-2xl sm:text-3xl font-extrabold text-foreground">
                      {businessProfile?.shopName || "Storefront QR Code"}
                    </h2>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      {businessProfile?.address || "Address not provided"}
                    </p>

                    <p className="text-xs sm:text-sm text-muted-foreground mt-3.5 leading-relaxed">
                      Display this code at your counter, entrance, or waiting lounge. Visitors scan to view wait times, browse services, and hold their spot in the digital queue without downloading any app.
                    </p>

                    {/* Store Identifier Pill with Copy Helper */}
                    <div className="w-full bg-muted/40 border border-border p-3.5 rounded-xl mt-4">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>STORE CODE IDENTIFIER</span>
                        <span className="text-[10px] text-primary">Direct booking</span>
                      </div>
                      <p className="text-xs font-mono text-foreground select-all truncate mt-1">
                        {businessProfile?.uniqueQrCode || "..."}
                      </p>
                    </div>
                  </div>

                  {/* Landscape Modal Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-4 border-t border-border/60">
                    <Button
                      onClick={handlePrintQR}
                      className="w-full sm:flex-1 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 py-2.5 shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print Sign / Poster
                    </Button>
                    <Button
                      onClick={handleCopyStoreLink}
                      variant="outline"
                      className="w-full sm:flex-1 text-xs sm:text-sm flex items-center justify-center gap-2 py-2.5"
                    >
                      <Copy className="w-4 h-4 text-primary" />
                      Copy Direct Link
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Ticket Details Modal */}
      <AnimatePresence>
        {isTicketModalOpen && selectedTicket && (
          <motion.div
            key="ticket-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 shrink-0">
                <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-md bg-primary/10 border border-primary/25 text-primary">
                  #{selectedTicket._id.slice(-4).toUpperCase()}
                </span>
                <StatusBadge status={selectedTicket.status} />
                {selectedTicket.verifiedAt ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified at Counter
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Unverified
                  </span>
                )}
              </div>

              <div className="overflow-y-auto pr-1 space-y-4 flex-1">
                {/* Customer Contact Card */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        {selectedTicket.customerId?.name || selectedTicket.customerName || "Customer"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(selectedTicket.joinedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {selectedTicket.customerId?.email && (
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {selectedTicket.customerId.email}
                      </span>
                    )}
                  </div>

                  {selectedTicket.customerId?.phone ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <a
                        href={`tel:${selectedTicket.customerId.phone}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call ({selectedTicket.customerId.phone})
                      </a>
                      <a
                        href={`sms:${selectedTicket.customerId.phone}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        Chat / SMS
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No phone number provided for this guest</p>
                  )}
                </div>

                {/* Requested Services Table */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Requested Services</span>
                    <span>{selectedTicket.selectedServices?.reduce((sum, s) => sum + (s.quantity || 1), 0) || 0} Total Units</span>
                  </h5>

                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60">
                    {selectedTicket.selectedServices?.map((srv, idx) => {
                      const qty = srv.quantity || 1;
                      const unitPrice = srv.cost || 0;
                      const totalCost = unitPrice * qty;
                      const totalDuration = (srv.durationMin || 0) * qty;

                      return (
                        <div key={idx} className="p-3 bg-card flex items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-foreground">
                              {srv.name} <span className="text-primary font-bold">×{qty}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {totalDuration} mins {unitPrice > 0 && `(₹${unitPrice} each)`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              ₹{totalCost}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              ~{totalDuration} min
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subtotals & Totals */}
                  <div className="flex items-center justify-between px-3 py-2 mt-2 bg-muted/30 rounded-lg text-xs font-semibold text-foreground">
                    <span>Grand Total</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        ~{selectedTicket.selectedServices?.reduce((sum, s) => sum + (s.durationMin || 0) * (s.quantity || 1), 0)} mins
                      </span>
                      <span className="text-primary font-bold">
                        ₹{selectedTicket.selectedServices?.reduce((sum, s) => sum + (s.cost || 0) * (s.quantity || 1), 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification Action / Status */}
                {(selectedTicket.status === "completed" || selectedTicket.status === "cancelled") ? (
                  selectedTicket.verifiedAt ? (
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-3">
                      <div className="text-xs">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Verified at Counter
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          Verified at {new Date(selectedTicket.verifiedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    </div>
                  ) : null
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-border flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Counter Verification</p>
                      <p className="text-muted-foreground text-[11px]">
                        {selectedTicket.verifiedAt 
                          ? `Verified at ${new Date(selectedTicket.verifiedAt).toLocaleTimeString()}`
                          : "Customer has not yet presented ticket QR code"}
                      </p>
                    </div>
                    {!selectedTicket.verifiedAt ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsTicketModalOpen(false);
                            openVerifyModalForTicket(selectedTicket);
                          }}
                          className="border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Scan QR
                        </Button>
                        <LoadingButton
                          size="sm"
                          loading={isVerifying}
                          loadingText="Verifying..."
                          onClick={handleVerifySelectedTicket}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verify
                        </LoadingButton>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status Action Controls */}
              <div className="flex items-center gap-2 pt-4 border-t border-border shrink-0 mt-2">
                {selectedTicket.status === "waiting" && (
                  <Button
                    onClick={async () => {
                      await handleUpdateStatus(selectedTicket._id, "in_progress");
                      setSelectedTicket(prev => prev ? { ...prev, status: "in_progress" } : null);
                    }}
                    className="flex-1 bg-primary text-primary-foreground font-semibold text-xs py-2"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    Call to Counter
                  </Button>
                )}

                {selectedTicket.status === "in_progress" && (
                  <Button
                    onClick={async () => {
                      await handleUpdateStatus(selectedTicket._id, "completed");
                      setSelectedTicket(prev => prev ? { ...prev, status: "completed" } : null);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Mark Completed
                  </Button>
                )}

                {(selectedTicket.status === "waiting" || selectedTicket.status === "in_progress") && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await handleUpdateStatus(selectedTicket._id, "cancelled");
                      setSelectedTicket(prev => prev ? { ...prev, status: "cancelled" } : null);
                    }}
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Cancel Ticket
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Counter Verification Modal with Live QR Camera Scanner & Manual Fallback */}
      <AnimatePresence>
        {isVerifyModalOpen && (
          <motion.div
            key="verify-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setTargetTicketForVerification(null);
                  setVerificationResult(null);
                  setVerifyInput("");
                }}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Counter Ticket Verification
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Scan customer QR code or enter ticket ID / token
                  </p>
                </div>
              </div>

              {/* Target Ticket Banner if opened for a specific ticket */}
              {targetTicketForVerification && (
                <div className="mb-4 p-2.5 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">
                      Verifying for: <strong className="font-semibold">{targetTicketForVerification.customerId?.name || targetTicketForVerification.customerName || "Customer"}</strong> (Ticket #{targetTicketForVerification._id.slice(-4).toUpperCase()})
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/15">
                    {targetTicketForVerification.status}
                  </span>
                </div>
              )}

              {/* Scanner Mode Toggle Tabs */}
              <div className="flex rounded-xl bg-muted p-1 mb-4 border border-border">
                <button
                  type="button"
                  onClick={() => setIsManualInputMode(false)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    !isManualInputMode
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Camera Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualInputMode(true)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    isManualInputMode
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Manual Code
                </button>
              </div>

              {/* Mode 1: Live QR Camera Scanner (Primary) */}
              {!isManualInputMode ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-black/30">
                    <QRScanner
                      onScan={handleScanFromCamera}
                      scannerId="dashboard-ticket-scanner"
                      hideCardWrap={true}
                    />
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {isVerifying ? "Verifying scanned ticket with server..." : "Align customer's ticket QR code within the camera frame."}
                  </p>
                </div>
              ) : (
                /* Mode 2: Manual Code Input (Fallback) */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyTicket(verifyInput);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <Label htmlFor="verify-token-input" className="text-xs font-semibold text-foreground">
                      Ticket Code / QR Payload
                    </Label>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        id="verify-token-input"
                        type="text"
                        placeholder="e.g. ql-ticket:... or #ABCD or 68f..."
                        value={verifyInput}
                        onChange={(e) => setVerifyInput(e.target.value)}
                        className="bg-background border-border text-foreground font-mono text-xs"
                        autoFocus
                      />
                      <LoadingButton
                        type="submit"
                        loading={isVerifying}
                        loadingText="Verifying..."
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 shrink-0"
                      >
                        Verify
                      </LoadingButton>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Enter the 6-character Ticket ID or token string shown on customer's phone.
                    </p>
                  </div>
                </form>
              )}

              {/* Verification Result Feedback */}
              {verificationResult && (
                <div
                  className={`mt-4 p-3.5 rounded-xl border text-xs ${
                    verificationResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {verificationResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{verificationResult.message}</p>
                      {verificationResult.ticket && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 text-foreground font-sans space-y-1">
                          <p><strong>Customer:</strong> {verificationResult.ticket.customerId?.name || verificationResult.ticket.customerName || "Customer"}</p>
                          <p><strong>Ticket:</strong> #{verificationResult.ticket._id?.slice(-4).toUpperCase()}</p>
                          <p><strong>Services:</strong> {verificationResult.ticket.selectedServices?.map((s: any) => `${s.name}${s.quantity > 1 ? ` (×${s.quantity})` : ""}`).join(", ")}</p>

                          {verificationResult.ticket.status === "waiting" && (
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  await handleUpdateStatus(verificationResult.ticket._id, "in_progress");
                                  setIsVerifyModalOpen(false);
                                  setTargetTicketForVerification(null);
                                  setVerificationResult(null);
                                  setVerifyInput("");
                                }}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2 flex items-center justify-center gap-1.5"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Start Customer Service Now
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsVerifyModalOpen(false);
                    setTargetTicketForVerification(null);
                    setVerificationResult(null);
                    setVerifyInput("");
                  }}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
