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
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { QueueFlowLoader, LoadingButton } from "@/components/loading";

interface QueueStatusData {
  _id: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled" | string;
  peopleAhead: number;
  currentEstimatedWait: number;
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

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (!queueId) return;

    fetchStatus();

    // Establish isolated socket connection
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.emit("join_queue", queueId);

    socket.on("status_updated", (updatedEntry: any) => {
      if (updatedEntry._id === queueId) {
        fetchStatus();

        if (updatedEntry.status === "in_progress" && typeof window !== "undefined" && Notification.permission === "granted") {
          new Notification("It's your turn!", {
            body: "The counter is ready for you. Please proceed forward.",
            icon: "/favicon.svg"
          });
        }
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
        toast.success("Push notifications enabled for your turn!");
      } else {
        toast.info("Notifications were declined. Keep this page open to track your ticket.");
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
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-[#0A1329] border border-[#203052]">
                    <Users className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                    <div className="text-2xl font-bold text-[#ECF2FF]">{peopleAhead}</div>
                    <div className="text-[11px] text-[#889DC2] uppercase mt-0.5">
                      People Ahead
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0A1329] border border-[#203052]">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-sky-400" />
                    <div className="text-2xl font-bold text-[#ECF2FF]">~{waitTime}</div>
                    <div className="text-[11px] text-[#889DC2] uppercase mt-0.5">
                      Mins Estimated
                    </div>
                  </div>
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
    </div>
  );
}
