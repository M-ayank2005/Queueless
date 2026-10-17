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

    // Establish isolated socket connection with auth token (polling first, then upgrade)
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const socket = io(socketUrl, {
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
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_queue", queueId);
    });

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
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-card border-border text-center p-6 shadow-md">
            <CardTitle className="text-lg font-bold text-foreground mb-2">
              Queue Ticket Not Found
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mb-6">
              This ticket may have expired, or the ID is invalid.
            </CardDescription>
            <Link href="/">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-sm">
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
    <div className="min-h-screen bg-background text-foreground pb-16 flex flex-col">
      <Navbar />

      <main className="container mx-auto max-w-md px-4 pt-24 flex-1 flex flex-col justify-center">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live Connected
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">
              {isCompleted
                ? "Service Completed"
                : isCancelled
                ? "Ticket Cancelled"
                : isInProgress
                ? "You are Being Served!"
                : "You're in the Queue!"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
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
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-xs">Turn Alerts</p>
                  <p className="text-[11px] text-muted-foreground">Notify me when 2 or fewer are ahead</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleRequestNotification}
                className="h-7 text-xs px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
              >
                Enable
              </Button>
            </div>
          )}

          {/* Stepper Timeline */}
          <div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between text-xs shadow-xs">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  isWaiting || isInProgress || isCompleted
                    ? "bg-primary text-white shadow-xs"
                    : "bg-muted/80 text-muted-foreground"
                }`}
              >
                1
              </div>
              <span className="font-semibold text-[11px] text-muted-foreground">In Line</span>
            </div>

            <div
              className={`h-0.5 flex-1 mx-3 transition-colors ${
                isInProgress || isCompleted ? "bg-primary" : "bg-border/60"
              }`}
            />

            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  isInProgress || isCompleted
                    ? "bg-primary text-white shadow-xs"
                    : peopleAhead <= 1 && !isCancelled
                    ? "bg-primary/20 border border-primary text-primary"
                    : "bg-muted/80 text-muted-foreground"
                }`}
              >
                2
              </div>
              <span className="font-semibold text-[11px] text-muted-foreground">Next Up</span>
            </div>

            <div
              className={`h-0.5 flex-1 mx-3 transition-colors ${
                isCompleted ? "bg-emerald-500" : "bg-border/60"
              }`}
            />

            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  isCompleted
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "bg-muted/80 text-muted-foreground"
                }`}
              >
                3
              </div>
              <span className="font-semibold text-[11px] text-muted-foreground">Served</span>
            </div>
          </div>

          {/* Active Turn Notification Banner */}
          {activeNotification && !isAlertDismissed && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className={`p-4 rounded-2xl border shadow-xs relative overflow-hidden ${
                  activeNotification.type === "YOUR_TURN"
                    ? "bg-emerald-500/10 border-emerald-500/35"
                    : "bg-amber-500/10 border-amber-500/35"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                      activeNotification.type === "YOUR_TURN"
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 animate-pulse"
                        : "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400 animate-pulse"
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
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {activeNotification.type === "YOUR_TURN" ? "Counter Ready" : "Turn Approaching"}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full animate-ping ${
                          activeNotification.type === "YOUR_TURN" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">
                      {activeNotification.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {activeNotification.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAlertDismissed(true)}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/60 transition-colors"
                    title="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Main Ticket Card (Apple Squircle Container) */}
          <Card className="bg-card border-border/70 shadow-xs rounded-3xl overflow-hidden">
            <CardHeader className="text-center pb-5 pt-6 border-b border-border/60">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Store className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">{shopName}</h3>
              </div>
              {address && (
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  {address}
                </p>
              )}
              <div className="pt-3.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block mb-1">
                  Your Digital Ticket
                </span>
                <div className="text-5xl font-extrabold font-mono text-primary tracking-tight">
                  #{ticketId}
                </div>
                <div className="mt-2.5">
                  <StatusBadge status={queueData.status} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-6">
              {!isCompleted && !isCancelled ? (
                <div>
                  <div className="grid grid-cols-2 gap-3.5 text-center">
                    <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 shadow-xs">
                      <Users className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                      <div className="text-2xl font-bold text-foreground tracking-tight">{peopleAhead}</div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase mt-0.5">
                        {peopleAhead === 1 ? "Person Ahead" : "People Ahead"}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 shadow-xs">
                      <Clock className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                      <div className="text-2xl font-bold text-foreground tracking-tight">
                        {queueData.prediction?.rangeDisplay 
                          ? `~${queueData.prediction.rangeDisplay}` 
                          : waitTime > 0 ? `~${waitTime} Mins` : "Next in Line"}
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase mt-0.5">
                        Estimated Wait
                      </div>
                    </div>
                  </div>

                  {/* Smart Prediction Telemetry Pill */}
                  {queueData.prediction?.confidenceLabel && (
                    <div className="mt-3.5 py-2.5 px-3.5 rounded-2xl bg-secondary/40 border border-border/60 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span>{queueData.prediction.confidenceLabel}</span>
                      </span>
                      {queueData.estimatedServiceStartTime && waitTime > 0 && (
                        <span className="text-primary font-semibold shrink-0">
                          Est. {new Date(queueData.estimatedServiceStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : isCompleted ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center text-emerald-600 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  This service ticket has been completed by the counter.
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center text-rose-600 dark:text-rose-300 text-xs">
                  <XCircle className="w-6 h-6 text-rose-500 mx-auto mb-1.5" />
                  This queue spot was cancelled.
                </div>
              )}

              {servicesList && (
                <div className="mt-4 pt-3.5 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">Requested Services:</span>{" "}
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
                className="w-full border-border/70 bg-card hover:bg-muted/50 text-xs text-foreground flex items-center justify-center gap-2 h-11 rounded-xl shadow-xs transition-transform active:scale-[0.98]"
              >
                <Share2 className="w-4 h-4 text-primary" />
                <span>{isGeneratingShare ? "Generating Link..." : "Share Live Ticket"}</span>
              </Button>
            )}

            {/* Turn Notification Opt-in */}
            {!notificationsEnabled && !isCompleted && !isCancelled && (
              <Button
                variant="outline"
                onClick={handleRequestNotification}
                className="w-full border-border/70 bg-card hover:bg-muted/50 text-xs text-foreground flex items-center justify-center gap-2 h-11 rounded-xl shadow-xs transition-transform active:scale-[0.98]"
              >
                <Bell className="w-4 h-4 text-primary" />
                Enable Turn Alerts
              </Button>
            )}

            {notificationsEnabled && !isCompleted && !isCancelled && (
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-center text-xs text-primary flex items-center justify-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-primary" />
                Turn alerts enabled on this device
              </div>
            )}

            {/* Cancel Spot Button */}
            {!isCompleted && !isCancelled && (
              <Button
                variant="outline"
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs h-11 rounded-xl transition-transform active:scale-[0.98]"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-50 w-full max-w-sm rounded-2xl border border-rose-500/40 bg-card p-6 shadow-xl"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cancel-title"
              aria-describedby="cancel-desc"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-400 mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <h2 id="cancel-title" className="text-base font-bold text-foreground">
                Leave the queue?
              </h2>
              <p id="cancel-desc" className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                If you leave now, you will lose your spot in line (Ticket #{ticketId}). You will need to join again from the end of the line.
              </p>

              <div className="flex items-center justify-end gap-2.5 mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="border-border text-xs text-foreground"
                  disabled={isCancelling}
                >
                  Stay in Line
                </Button>
                <LoadingButton
                  size="sm"
                  onClick={handleCancelSpot}
                  loading={isCancelling}
                  loadingText="Leaving..."
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-xl z-50 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Share Live Ticket</h3>
                    <p className="text-xs text-muted-foreground">Public live queue tracking</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
                🛡️ <span className="font-semibold text-foreground">Zero Personal Data:</span> Anyone with this link can track your live queue position and estimated turn in real-time, but your name, phone, and account details are strictly private.
              </div>

              {shareToken && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Public Share Link
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/shared/${shareToken}` : ""}
                      className="bg-transparent text-xs text-foreground font-mono flex-1 outline-none truncate"
                    />
                    <Button
                      size="sm"
                      onClick={copyShareUrl}
                      className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shrink-0"
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
                  className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs h-9"
                >
                  {isRevokingShare ? "Revoking..." : "Revoke Share Link"}
                </Button>

                <Button
                  onClick={() => setIsShareModalOpen(false)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-4 shadow-sm"
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
