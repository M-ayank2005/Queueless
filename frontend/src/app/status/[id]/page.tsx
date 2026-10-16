"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Users, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Bell, 
  BellRing,
  Ticket,
  AlertTriangle,
  Store,
  MapPin,
  RefreshCw,
  Sparkles,
  Zap,
  Share2,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { QueueFlowLoader, LoadingButton } from "@/components/loading";

interface PredictionMetadata {
  speedRatio?: number;
  confidence?: "standard" | "medium" | "high";
  confidenceLabel?: string;
  minWaitMin?: number;
  maxWaitMin?: number;
  rangeDisplay?: string;
  sampleSize?: number;
}

interface QueueAlertData {
  active: boolean;
  type: "TURN_APPROACHING" | "YOUR_TURN";
  title: string;
  message: string;
}

interface NotificationBannerData {
  type: "TURN_APPROACHING" | "YOUR_TURN";
  title: string;
  message: string;
  peopleAhead?: number;
}

interface QueueStatusData {
  _id: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled" | string;
  peopleAhead: number;
  currentEstimatedWait: number;
  estimatedServiceStartTime?: string;
  prediction?: PredictionMetadata;
  alert?: QueueAlertData | null;
  selectedServices?: Array<{
    name: string;
    durationMin?: number;
    cost?: number;
  }>;
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

export default function StatusPage() {
  const params = useParams();
  const queueId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [queueData, setQueueData] = useState<QueueStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [activeNotification, setActiveNotification] = useState<NotificationBannerData | null>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  // Phase 7: Secure Shareable Tickets State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isRevokingShare, setIsRevokingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleGenerateShare = async () => {
    try {
      setIsGeneratingShare(true);
      const res = await api.post(`/queue/${queueId}/share`);
      setShareToken(res.data.shareToken);
      setIsShareModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to generate share link");
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleRevokeShare = async () => {
    try {
      setIsRevokingShare(true);
      await api.delete(`/queue/${queueId}/share`);
      setShareToken(null);
      setIsShareModalOpen(false);
      toast.success("Share link has been revoked.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke share link");
    } finally {
      setIsRevokingShare(false);
    }
  };

  const copyShareUrl = () => {
    if (typeof window !== "undefined" && shareToken) {
      const url = `${window.location.origin}/shared/${shareToken}`;
      navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      toast.success("Public tracking link copied!");
    }
  };

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (!queueId) return;

    fetchStatus();

    // Establish isolated socket connection with auth token
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: {
        token: token || undefined
      }
    });
    socketRef.current = socket;

    socket.emit("join_queue", queueId);

    // Dedicated Phase 4 Turn-Approaching & Your-Turn Notification Listener
    socket.on("customer_notification", (notif: any) => {
      if (notif.ticketId === queueId) {
        setActiveNotification({
          type: notif.type,
          title: notif.title,
          message: notif.message,
          peopleAhead: notif.peopleAhead
        });
        setIsAlertDismissed(false);

        if (notif.type === "YOUR_TURN") {
          toast.success(`${notif.title} — ${notif.message}`);
        } else {
          toast.info(`${notif.title} — ${notif.message}`);
        }

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(notif.title, {
              body: notif.message,
              icon: "/icon.svg"
            });
          } catch {
            // Browser push notification fallback
          }
        }

        fetchStatus();
      }
    });

    socket.on("status_updated", (updatedEntry: any) => {
      if (updatedEntry._id === queueId) {
        fetchStatus();
      }
    });

    // Poll every 30 seconds as reliable fallback
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [queueId]);

  const fetchStatus = async () => {
    try {
      const res = await api.get(`/queue/status/${queueId}`);
      setQueueData(res.data);

      if (res.data?.alert?.active && !isAlertDismissed) {
        setActiveNotification({
          type: res.data.alert.type,
          title: res.data.alert.title,
          message: res.data.alert.message,
          peopleAhead: res.data.peopleAhead
        });
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNotification = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Push notifications enabled! You'll be alerted when your turn approaches.");
        try {
          new Notification("QueueLess Alerts Active 🔔", {
            body: "We will alert you when you have 2 or fewer people ahead of you.",
            icon: "/icon.svg"
          });
        } catch {}
      } else {
        toast.info("Notifications were declined. Keep this screen open to follow your place in line.");
      }
    } else {
      toast.info("Browser notifications not supported on this device.");
    }
  };

  const handleCancelSpot = async () => {
    setIsCancelling(true);
    try {
      await api.post("/queue/cancel", { queueId });
      toast.info("Your queue reservation has been cancelled.");
      router.push("/");
    } catch {
      toast.error("Failed to cancel ticket. It may already be completed.");
      setIsCancelModalOpen(false);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <QueueFlowLoader
        variant="page"
        size="lg"
        message="Checking live ticket status..."
        submessage="Synchronizing real-time queue position with service counter"
      />
    );
  }

  if (!queueData) {
    return (
      <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-[#101A32] border-[#203052] text-center p-6">
            <CardTitle className="text-lg font-bold text-[#ECF2FF] mb-2">
              Queue Ticket Not Found
            </CardTitle>
            <CardDescription className="text-xs text-[#889DC2] mb-6">
              This ticket may have expired, or the ID is invalid.
            </CardDescription>
            <Link href="/">
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs">
                Back to Home
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const peopleAhead = queueData.peopleAhead || 0;
  const waitTime = queueData.currentEstimatedWait || 0;
  const ticketId = queueData._id.slice(-4).toUpperCase();
  const shopName =
    queueData.businessId?.businessProfile?.shopName ||
    queueData.businessId?.shopName ||
    "QueueLess Store";
  const address =
    queueData.businessId?.businessProfile?.address ||
    queueData.businessId?.address;
  const servicesList = queueData.selectedServices?.map((s) => s.name).join(", ");

  const isCompleted = queueData.status === "completed";
  const isCancelled = queueData.status === "cancelled";
  const isInProgress = queueData.status === "in_progress";
  const isWaiting = queueData.status === "waiting";

  return (
    <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] pb-16 flex flex-col">
      <Navbar />

      <main className="container mx-auto max-w-md px-4 pt-24 flex-1 flex flex-col justify-center">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#889DC2] hover:text-[#ECF2FF] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to My Queues
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Header Card */}
          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Live Connected
            </div>
            <h1 className="text-2xl font-extrabold text-[#ECF2FF]">
              {isCompleted
                ? "Service Completed"
                : isCancelled
                ? "Ticket Cancelled"
                : isInProgress
                ? "You are Being Served!"
                : "You're in the Queue!"}
            </h1>
            <p className="text-xs text-[#889DC2] mt-1">
              {isCompleted
                ? "Thank you for visiting."
                : isCancelled
                ? "This booking was removed."
                : isInProgress
                ? "Please head to the counter now."
                : "Watch your number below as the line advances."}
            </p>
          </div>

          {/* Turn Notification Permission Banner */}
          {!notificationsEnabled && isWaiting && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/40 border border-blue-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-[#ECF2FF] text-xs">Turn Alerts</p>
                  <p className="text-[11px] text-[#889DC2]">Notify me when 2 or fewer are ahead</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleRequestNotification}
                className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20"
              >
                Enable
              </Button>
            </div>
          )}

          {/* Stepper Timeline */}
          <div className="p-4 rounded-2xl bg-[#0A1329] border border-[#203052] flex items-center justify-between text-xs">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-colors ${
                  isWaiting || isInProgress || isCompleted
                    ? "bg-blue-600 text-white"
                    : "bg-[#152243] text-[#889DC2]"
                }`}
              >
                1
              </div>
              <span className="font-medium text-[10px] text-[#C5D5F5]">In Line</span>
            </div>

            <div
              className={`h-0.5 flex-1 mx-2 transition-colors ${
                isInProgress || isCompleted ? "bg-blue-600" : "bg-[#203052]"
              }`}
            />

            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-colors ${
                  isInProgress || isCompleted
                    ? "bg-blue-600 text-white"
                    : peopleAhead <= 1 && !isCancelled
                    ? "bg-blue-500/30 border border-blue-500 text-blue-300"
                    : "bg-[#152243] text-[#889DC2]"
                }`}
              >
                2
              </div>
              <span className="font-medium text-[10px] text-[#C5D5F5]">Next Up</span>
            </div>

            <div
              className={`h-0.5 flex-1 mx-2 transition-colors ${
                isCompleted ? "bg-emerald-500" : "bg-[#203052]"
              }`}
            />

            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-colors ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : "bg-[#152243] text-[#889DC2]"
                }`}
              >
                3
              </div>
              <span className="font-medium text-[10px] text-[#C5D5F5]">Served</span>
            </div>
          </div>

          {/* Active Turn Notification Banner */}
          {activeNotification && !isAlertDismissed && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className={`p-4 rounded-2xl border shadow-xl relative overflow-hidden ${
                  activeNotification.type === "YOUR_TURN"
                    ? "bg-gradient-to-r from-emerald-500/20 via-blue-500/10 to-emerald-500/20 border-emerald-500/60 shadow-emerald-500/15"
                    : "bg-gradient-to-r from-amber-500/20 via-blue-500/10 to-amber-500/20 border-amber-500/60 shadow-amber-500/15"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                      activeNotification.type === "YOUR_TURN"
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 animate-bounce"
                        : "bg-amber-500/20 border-amber-500/50 text-amber-400 animate-pulse"
                    }`}
                  >
                    {activeNotification.type === "YOUR_TURN" ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <BellRing className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider ${
                          activeNotification.type === "YOUR_TURN"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {activeNotification.type === "YOUR_TURN" ? "Counter Ready" : "Turn Approaching"}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full animate-ping ${
                          activeNotification.type === "YOUR_TURN" ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                    </div>
                    <h4 className="text-sm font-bold text-[#ECF2FF]">
                      {activeNotification.title}
                    </h4>
                    <p className="text-xs text-[#C5D5F5] mt-1 leading-relaxed">
                      {activeNotification.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAlertDismissed(true)}
                    className="absolute top-3 right-3 text-[#889DC2] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    title="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Main Ticket Card */}
          <Card className="bg-[#101A32] border-[#203052] shadow-2xl overflow-hidden">
            <CardHeader className="text-center pb-4 border-b border-[#203052]/60">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Store className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-[#ECF2FF]">{shopName}</h3>
              </div>
              {address && (
                <p className="text-[11px] text-[#889DC2] flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  {address}
                </p>
              )}
              <div className="pt-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#889DC2] block mb-1">
                  Your Digital Ticket
                </span>
                <div className="text-5xl font-extrabold font-mono text-blue-400 tracking-wider">
                  #{ticketId}
                </div>
                <div className="mt-2">
                  <StatusBadge status={queueData.status} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-6">
              {!isCompleted && !isCancelled ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-xl bg-[#0A1329] border border-[#203052]">
                      <Users className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                      <div className="text-2xl font-bold text-[#ECF2FF]">{peopleAhead}</div>
                      <div className="text-[11px] text-[#889DC2] uppercase mt-0.5">
                        {peopleAhead === 1 ? "Person Ahead" : "People Ahead"}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0A1329] border border-[#203052]">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-sky-400" />
                      <div className="text-2xl font-bold text-[#ECF2FF]">
                        {queueData.prediction?.rangeDisplay 
                          ? `~${queueData.prediction.rangeDisplay}` 
                          : waitTime > 0 ? `~${waitTime} Mins` : "Next in Line"}
                      </div>
                      <div className="text-[11px] text-[#889DC2] uppercase mt-0.5">
                        Estimated Wait
                      </div>
                    </div>
                  </div>

                  {/* Smart Prediction Telemetry Pill */}
                  {queueData.prediction?.confidenceLabel && (
                    <div className="mt-3 py-2 px-3 rounded-xl bg-[#081023] border border-[#203052] flex items-center justify-between text-[11px]">
                      <span className="text-[#889DC2] flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{queueData.prediction.confidenceLabel}</span>
                      </span>
                      {queueData.estimatedServiceStartTime && waitTime > 0 && (
                        <span className="text-blue-400 font-semibold shrink-0">
                          Est. {new Date(queueData.estimatedServiceStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : isCompleted ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center text-emerald-300 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  This service ticket has been completed by the counter.
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center text-rose-300 text-xs">
                  <XCircle className="w-6 h-6 text-rose-400 mx-auto mb-1.5" />
                  This queue spot was cancelled.
                </div>
              )}

              {servicesList && (
                <div className="mt-4 pt-3 border-t border-[#203052]/60 text-xs text-[#889DC2]">
                  <span className="text-[#ECF2FF] font-medium">Requested Services:</span>{" "}
                  {servicesList}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Row */}
          <div className="space-y-3">
            {/* Share Live Ticket Button */}
            {!isCancelled && (
              <Button
                variant="outline"
                onClick={handleGenerateShare}
                disabled={isGeneratingShare}
                className="w-full border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-xs text-blue-300 hover:text-white flex items-center justify-center gap-2 py-5"
              >
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>{isGeneratingShare ? "Generating Link..." : "Share Live Ticket"}</span>
              </Button>
            )}

            {/* Turn Notification Opt-in */}
            {!notificationsEnabled && !isCompleted && !isCancelled && (
              <Button
                variant="outline"
                onClick={handleRequestNotification}
                className="w-full border-[#203052] bg-[#101A32] hover:bg-[#152243] text-xs text-[#ECF2FF] flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4 text-blue-400" />
                Enable Turn Alerts
              </Button>
            )}

            {notificationsEnabled && !isCompleted && !isCancelled && (
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center text-xs text-blue-300 flex items-center justify-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-blue-400" />
                Turn alerts enabled on this device
              </div>
            )}

            {/* Cancel Spot Button */}
            {!isCompleted && !isCancelled && (
              <Button
                variant="outline"
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs"
              >
                Cancel My Spot
              </Button>
            )}
          </div>
        </motion.div>
      </main>

      {/* Accessible Cancel Spot Confirmation Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCancelModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-50 w-full max-w-sm rounded-2xl border border-rose-500/40 bg-[#101A32] p-6 shadow-2xl"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cancel-title"
              aria-describedby="cancel-desc"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <h2 id="cancel-title" className="text-base font-bold text-[#ECF2FF]">
                Leave the queue?
              </h2>
              <p id="cancel-desc" className="text-xs text-[#889DC2] mt-1.5 leading-relaxed">
                If you leave now, you will lose your spot in line (Ticket #{ticketId}). You will need to join again from the end of the line.
              </p>

              <div className="flex items-center justify-end gap-2.5 mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="border-[#203052] text-xs text-[#ECF2FF]"
                  disabled={isCancelling}
                >
                  Stay in Line
                </Button>
                <LoadingButton
                  size="sm"
                  onClick={handleCancelSpot}
                  loading={isCancelling}
                  loadingText="Leaving..."
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Leave Queue
                </LoadingButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Live Ticket Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md bg-[#101A32] border border-[#203052] rounded-3xl p-6 shadow-2xl z-50 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Share Live Ticket</h3>
                    <p className="text-xs text-[#889DC2]">Public live queue tracking</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200/90 leading-relaxed">
                🛡️ <span className="font-semibold text-white">Zero Personal Data:</span> Anyone with this link can track your live queue position and estimated turn in real-time, but your name, phone, and account details are strictly private.
              </div>

              {shareToken && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Public Share Link
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0A1329] border border-[#203052]">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/shared/${shareToken}` : ""}
                      className="bg-transparent text-xs text-slate-200 font-mono flex-1 outline-none truncate"
                    />
                    <Button
                      size="sm"
                      onClick={copyShareUrl}
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0"
                    >
                      {shareCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={handleRevokeShare}
                  disabled={isRevokingShare}
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs h-9"
                >
                  {isRevokingShare ? "Revoking..." : "Revoke Share Link"}
                </Button>

                <Button
                  onClick={() => setIsShareModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-9 px-4"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
