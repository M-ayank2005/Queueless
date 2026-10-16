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
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Label } from "@/components/ui/label";
import { io, Socket } from "socket.io-client";

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
  }>;
  customerId?: {
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
}

export default function Dashboard() {
  const [services, setServices] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [newService, setNewService] = useState({ name: "", durationMin: "", cost: "" });
  const [isAddingService, setIsAddingService] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

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

  const socketRef = useRef<Socket | null>(null);

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsQrModalOpen(false);
        setIsSettingsOpen(false);
      }
    };
    if (isQrModalOpen || isSettingsOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQrModalOpen, isSettingsOpen]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.role !== "business") {
        router.push("/");
        return;
      }
    } catch {
      router.push("/login");
      return;
    }

    fetchDashboardData();

    // Setup Socket connection
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socketInstance = io(socketUrl, {
      transports: ["websocket", "polling"]
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
  }, [router]);

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

  if (loading) {
    return (
      <QueueFlowLoader
        variant="page"
        size="lg"
        message="Connecting to store counter..."
        submessage="Loading live customer queue and store operations"
      />
    );
  }

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

  const activeQueueCount = activeQueue.length;
  const storeOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const storeUrl = `${storeOrigin}/store/${businessProfile?.uniqueQrCode || ""}`;

  return (
    <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] pb-20">
      <Navbar />

      <main className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* Dashboard Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#203052]">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ECF2FF]">
                {businessProfile?.shopName || "Store Dashboard"}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Store Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#889DC2] flex items-center gap-1.5 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              {businessProfile?.address || "Address not provided"}
              <span className="text-[#203052] mx-1">•</span>
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              {businessProfile?.workingHours?.openTime && businessProfile?.workingHours?.closeTime
                ? `${businessProfile.workingHours.openTime} - ${businessProfile.workingHours.closeTime}`
                : "24/7 Service"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="outline"
              className="border-[#203052] bg-[#101A32] hover:bg-[#152243] text-[#ECF2FF] flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-blue-400" />
              Store Settings
            </Button>
          </div>
        </div>

        {/* Dashboard Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Live Queue (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-[#101A32] border-[#203052] shadow-xl">
              <CardHeader className="pb-4 border-b border-[#203052]/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-[#ECF2FF]">
                        Current Customer Queue
                      </CardTitle>
                      <CardDescription className="text-xs text-[#889DC2]">
                        Real-time visitor flow and counter caller.
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    {activeQueueCount} In Line
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-3">
                {activeQueue.length === 0 ? (
                  <div className="text-center py-16 px-4 border border-dashed border-[#203052] rounded-xl bg-[#0A1329]/50">
                    <Users className="w-10 h-10 text-[#889DC2]/60 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-[#ECF2FF] mb-1">
                      No Customers in Line
                    </h3>
                    <p className="text-xs text-[#889DC2] max-w-sm mx-auto">
                      Your queue is currently clear. Display your storefront QR code for walk-ins to scan and join.
                    </p>
                  </div>
                ) : (
                  activeQueue.map((item) => {
                    const customerName = item.customerId?.name || item.customerName || "Customer";
                    const customerPhone = item.customerId?.phone;
                    const ticketNumber = item._id.slice(-4).toUpperCase();
                    const servicesString = item.selectedServices?.map(s => s.name).join(", ");
                    const isWaiting = item.status === "waiting";
                    const isInProgress = item.status === "in_progress";

                    return (
                      <motion.div
                        key={item._id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border transition-all ${
                          isInProgress
                            ? "bg-[#152243] border-blue-500/50 shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                            : "bg-[#0A1329] border-[#203052]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400">
                                #{ticketNumber}
                              </span>
                              <h3 className="font-bold text-base text-[#ECF2FF]">
                                {customerName}
                              </h3>
                              <StatusBadge status={item.status} />
                            </div>

                            {customerPhone && (
                              <p className="text-xs text-[#889DC2] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-blue-400" />
                                {customerPhone}
                              </p>
                            )}

                            {servicesString && (
                              <p className="text-xs text-[#C5D5F5] pt-0.5">
                                <span className="text-[#889DC2]">Services:</span> {servicesString}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons for active tickets */}
                          <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#203052]">
                            {isWaiting && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(item._id, "in_progress")}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Call Customer
                              </Button>
                            )}

                            {isInProgress && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(item._id, "completed")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Complete
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(item._id, "cancelled")}
                              className="border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs flex items-center gap-1"
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
            <Card className="bg-[#101A32] border-[#203052] shadow-xl">
              <CardHeader className="pb-4 border-b border-[#203052]/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-[#ECF2FF]">
                        Processed Customers
                      </CardTitle>
                      <CardDescription className="text-xs text-[#889DC2]">
                        Recently served or resolved customers (most recent 10).
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    {processedQueue.length} Recent
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-3">
                {processedQueue.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-[#203052] rounded-xl bg-[#0A1329]/50">
                    <CheckCircle2 className="w-8 h-8 text-[#889DC2]/60 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-[#ECF2FF] mb-1">
                      No Processed Customers Yet
                    </h3>
                    <p className="text-xs text-[#889DC2] max-w-sm mx-auto">
                      Customers who are marked completed or cancelled will appear here in reverse chronological order.
                    </p>
                  </div>
                ) : (
                  processedQueue.map((item) => {
                    const customerName = item.customerId?.name || item.customerName || "Customer";
                    const customerPhone = item.customerId?.phone;
                    const ticketNumber = item._id.slice(-4).toUpperCase();
                    const servicesString = item.selectedServices?.map(s => s.name).join(", ");
                    const processedTimestamp = item.updatedAt || item.joinedAt;
                    const processedTimeStr = processedTimestamp
                      ? new Date(processedTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";

                    return (
                      <div
                        key={item._id}
                        className="p-3.5 rounded-xl border border-[#203052] bg-[#0A1329]/70 hover:bg-[#0A1329] transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400">
                                #{ticketNumber}
                              </span>
                              <h3 className="font-bold text-sm text-[#ECF2FF]">
                                {customerName}
                              </h3>
                              <StatusBadge status={item.status} />
                            </div>

                            {customerPhone && (
                              <p className="text-xs text-[#889DC2] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-blue-400" />
                                {customerPhone}
                              </p>
                            )}

                            {servicesString && (
                              <p className="text-xs text-[#C5D5F5] pt-0.5">
                                <span className="text-[#889DC2]">Services:</span> {servicesString}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-xs text-[#889DC2] sm:self-center">
                            {processedTimeStr && (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#101A32] border border-[#203052]">
                                <Clock className="w-3 h-3 text-blue-400" />
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
            <Card className="bg-[#101A32] border border-[#203052] shadow-xl text-center">
              <CardHeader className="pb-3 border-b border-[#203052]/60">
                <CardTitle className="text-base font-bold text-[#ECF2FF] flex items-center justify-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  Storefront QR Code
                </CardTitle>
                <CardDescription className="text-xs text-[#889DC2]">
                  Customers scan this to open your store menu and book tickets.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 flex flex-col items-center">
                {/* Clickable QR Code Container with designated ID and zoom hover hint */}
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="group relative bg-white p-3.5 rounded-2xl shadow-xl inline-block mb-2 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-transparent hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <Maximize2 className="w-5 h-5 text-blue-400" />
                    <span>Enlarge QR</span>
                  </div>
                </button>

                <p className="text-[11px] text-[#889DC2] flex items-center justify-center gap-1 mb-3">
                  <Maximize2 className="w-3 h-3 text-blue-400" />
                  <span>Click QR code to view enlarged</span>
                </p>

                <div className="w-full max-w-xs space-y-2 mb-4">
                  <p className="text-xs font-mono text-[#889DC2] bg-[#0A1329] px-3 py-1.5 rounded-lg border border-[#203052] truncate">
                    Code: {businessProfile?.uniqueQrCode || "..."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    onClick={handleCopyStoreLink}
                    variant="outline"
                    className="border-[#203052] hover:bg-[#152243] text-xs text-[#ECF2FF] flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={handlePrintQR}
                    className="bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Sign
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Services Management Card - Located below QR */}
            <Card className="bg-[#101A32] border-[#203052] shadow-xl">
              <CardHeader className="pb-3 border-b border-[#203052]/60">
                <CardTitle className="text-base font-bold text-[#ECF2FF] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Offered Services
                </CardTitle>
                <CardDescription className="text-xs text-[#889DC2]">
                  Customers select from these when scanning your QR.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Services List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {services.length === 0 ? (
                    <p className="text-xs text-[#889DC2] text-center py-4">
                      No services added yet. Add at least one below.
                    </p>
                  ) : (
                    services.map((service, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#0A1329] border border-[#203052] text-sm"
                      >
                        <div>
                          <div className="font-semibold text-[#ECF2FF] text-xs sm:text-sm">
                            {service.name}
                          </div>
                          <div className="text-[11px] text-[#889DC2] mt-0.5">
                            {service.durationMin} mins • ${service.cost}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveService(idx)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          aria-label={`Remove service ${service.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Service Inline Form */}
                <form onSubmit={handleAddService} className="pt-3 border-t border-[#203052] space-y-2">
                  <Input
                    placeholder="Service Name (e.g. Haircut)"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    className="bg-[#0A1329] border-[#203052] text-xs text-[#ECF2FF]"
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Duration (mins)"
                      value={newService.durationMin}
                      onChange={(e) => setNewService({ ...newService, durationMin: e.target.value })}
                      className="bg-[#0A1329] border-[#203052] text-xs text-[#ECF2FF]"
                      min="1"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Price ($)"
                      value={newService.cost}
                      onChange={(e) => setNewService({ ...newService, cost: e.target.value })}
                      className="bg-[#0A1329] border-[#203052] text-xs text-[#ECF2FF]"
                      min="0"
                      required
                    />
                  </div>

                  <LoadingButton
                    type="submit"
                    loading={isAddingService}
                    loadingText="Adding Service..."
                    icon={<Plus className="w-4 h-4" />}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    Add Service
                  </LoadingButton>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Store Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-50 w-full max-w-lg rounded-2xl border border-[#203052] bg-[#101A32] p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-dialog-title"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#203052]">
                <h2 id="settings-dialog-title" className="text-lg font-bold text-[#ECF2FF] flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  Store Configuration
                </h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-lg text-[#889DC2] hover:text-[#ECF2FF] hover:bg-[#152243]"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="shop-name" className="text-xs text-[#C5D5F5] font-medium">
                    Store / Shop Name *
                  </Label>
                  <Input
                    id="shop-name"
                    value={settingsForm.shopName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                    className="bg-[#0A1329] border-[#203052] text-[#ECF2FF]"
                    placeholder="e.g. Modern Barber & Spa"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="shop-address" className="text-xs text-[#C5D5F5] font-medium">
                    Store Address / Location
                  </Label>
                  <Input
                    id="shop-address"
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    className="bg-[#0A1329] border-[#203052] text-[#ECF2FF]"
                    placeholder="e.g. 124 Market Street, Suite 400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="open-time" className="text-xs text-[#C5D5F5] font-medium">
                      Opening Time
                    </Label>
                    <Input
                      id="open-time"
                      type="time"
                      value={settingsForm.openTime}
                      onChange={(e) => setSettingsForm({ ...settingsForm, openTime: e.target.value })}
                      className="bg-[#0A1329] border-[#203052] text-[#ECF2FF]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="close-time" className="text-xs text-[#C5D5F5] font-medium">
                      Closing Time
                    </Label>
                    <Input
                      id="close-time"
                      type="time"
                      value={settingsForm.closeTime}
                      onChange={(e) => setSettingsForm({ ...settingsForm, closeTime: e.target.value })}
                      className="bg-[#0A1329] border-[#203052] text-[#ECF2FF]"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs text-[#C5D5F5] font-medium">
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
                              ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                              : "bg-[#0A1329] border-[#203052] text-[#889DC2] hover:text-[#ECF2FF]"
                          }`}
                        >
                          {dayName.slice(0, 3)} {isChecked ? "✗" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#203052]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSettingsOpen(false)}
                    className="border-[#203052] hover:bg-[#152243] text-[#ECF2FF]"
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    type="submit"
                    loading={isSavingSettings}
                    loadingText="Saving Settings..."
                    className="bg-blue-600 hover:bg-blue-500 text-white min-w-[140px]"
                  >
                    Save Settings
                  </LoadingButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enlarged QR Code Centered Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dimmed backdrop with fade animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsQrModalOpen(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Centered Modal Window with spring popup animation - Landscape Layout on Web */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative z-50 w-full max-w-3xl lg:max-w-4xl rounded-3xl border border-[#203052] bg-[#101A32] p-6 sm:p-8 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="enlarged-qr-title"
            >
              {/* Cross / Close button to minimize/close */}
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl text-[#889DC2] hover:text-[#ECF2FF] hover:bg-[#152243] border border-[#203052] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close enlarged QR modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Landscape 2-Column Content Layout */}
              <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 sm:gap-8">
                {/* Left Column: QR Code Display Frame */}
                <div className="w-full md:w-auto flex flex-col items-center justify-center p-6 sm:p-8 bg-[#0A1329] border border-[#203052] rounded-2xl shrink-0">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-2xl border-4 border-blue-500/25">
                    <QRCode
                      id="enlarged-store-qr-code-svg"
                      value={storeUrl}
                      size={240}
                      level="H"
                    />
                  </div>
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-[#889DC2] font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Scan with any smartphone camera</span>
                  </div>
                </div>

                {/* Right Column: Store Info, Code & Actions */}
                <div className="flex-1 flex flex-col justify-between text-left w-full py-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/25 text-blue-400">
                        <QrCode className="w-3 h-3" />
                        Storefront Counter Poster
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </div>

                    <h2 id="enlarged-qr-title" className="text-2xl sm:text-3xl font-extrabold text-[#ECF2FF]">
                      {businessProfile?.shopName || "Storefront QR Code"}
                    </h2>

                    <p className="text-xs text-[#889DC2] flex items-center gap-1.5 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      {businessProfile?.address || "Address not provided"}
                    </p>

                    <p className="text-xs sm:text-sm text-[#C5D5F5] mt-3.5 leading-relaxed">
                      Display this code at your counter, entrance, or waiting lounge. Visitors scan to view wait times, browse services, and hold their spot in the digital queue without downloading any app.
                    </p>

                    {/* Store Identifier Pill with Copy Helper */}
                    <div className="w-full bg-[#0A1329] border border-[#203052] p-3.5 rounded-xl mt-4">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#889DC2]">
                        <span>STORE CODE IDENTIFIER</span>
                        <span className="text-[10px] text-blue-400">Direct booking</span>
                      </div>
                      <p className="text-xs font-mono text-[#ECF2FF] select-all truncate mt-1">
                        {businessProfile?.uniqueQrCode || "..."}
                      </p>
                    </div>
                  </div>

                  {/* Landscape Modal Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-4 border-t border-[#203052]/60">
                    <Button
                      onClick={handlePrintQR}
                      className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm text-white font-semibold flex items-center justify-center gap-2 py-2.5 shadow-[0_0_16px_rgba(59,130,246,0.3)]"
                    >
                      <Printer className="w-4 h-4" />
                      Print Sign / Poster
                    </Button>
                    <Button
                      onClick={handleCopyStoreLink}
                      variant="outline"
                      className="w-full sm:flex-1 border-[#203052] bg-[#0A1329] hover:bg-[#152243] text-xs sm:text-sm text-[#ECF2FF] flex items-center justify-center gap-2 py-2.5"
                    >
                      <Copy className="w-4 h-4 text-blue-400" />
                      Copy Direct Link
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
