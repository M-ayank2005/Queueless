"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Clock, 
  Users, 
  Store, 
  MapPin, 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueueFlowLoader } from "@/components/loading";
import api from "@/lib/api";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

interface PredictionMetadata {
  speedRatio?: number;
  confidence?: "standard" | "medium" | "high";
  confidenceLabel?: string;
  minWaitMin?: number;
  maxWaitMin?: number;
  rangeDisplay?: string;
  sampleSize?: number;
}

interface SharedTicketData {
  ticketNumber: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled" | string;
  shopName: string;
  shopAddress: string;
  joinedAt: string;
  selectedServices: Array<{
    name: string;
    durationMin: number;
    cost?: number;
  }>;
  peopleAhead: number;
  currentEstimatedWait: number;
  estimatedServiceStartTime?: string;
  prediction?: PredictionMetadata;
  shareToken: string;
}

export default function SharedTicketPage() {
  const params = useParams();
  const token = params.token as string;

  const [ticketData, setTicketData] = useState<SharedTicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSharedTicket = async (isManual = false) => {
    if (!token) return;
    try {
      if (isManual) setIsRefreshing(true);
      const res = await api.get(`/queue/shared/${token}`);
      setTicketData(res.data);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("This shared ticket link is invalid, expired, or has been revoked.");
      } else {
        setError(err.response?.data?.message || "Failed to load shared queue ticket.");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSharedTicket();

    // Setup Socket.IO real-time listener for public room
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    const socket = io(socketUrl);

    socket.on("connect", () => {
      socket.emit("join_shared_ticket", token);
    });

    socket.on("shared_ticket_updated", (updated: SharedTicketData) => {
      setTicketData(updated);
      setLastRefreshed(new Date());
    });

    socket.on("ticket_share_revoked", () => {
      setIsRevoked(true);
    });

    // Polling fallback every 15 seconds
    const interval = setInterval(() => {
      if (!isRevoked && !error) {
        fetchSharedTicket();
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [token]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <QueueFlowLoader
          variant="page"
          message="Loading Shared Ticket..."
          submessage="Retrieving live queue position and counter telemetry"
        />
      </div>
    );
  }

  if (isRevoked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-amber-500/30 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Share Link Revoked
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              The ticket holder has revoked public sharing for this queue ticket. For status updates, please check with them directly.
            </p>
          </div>
          <Button
            asChild
            className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/60"
          >
            <Link href="/">Return to QueueLess Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Ticket Not Found
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              {error || "This shared ticket link is invalid or has expired."}
            </p>
          </div>
          <Button
            asChild
            className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/60"
          >
            <Link href="/">Go to QueueLess Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isServing = ticketData.status === "in_progress";
  const isCompleted = ticketData.status === "completed";
  const isCancelled = ticketData.status === "cancelled";
  const isWaiting = ticketData.status === "waiting";

  const totalDuration = ticketData.selectedServices.reduce(
    (sum, s) => sum + (s.durationMin || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top guest bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-600/30">
              Q
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              QueueLess
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Guest View</span>
            </div>

            <button
              onClick={() => fetchSharedTicket(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Store Info Card */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
                {ticketData.shopName}
              </h2>
              {ticketData.shopAddress ? (
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate max-w-xs">{ticketData.shopAddress}</span>
                </p>
              ) : null}
            </div>
          </div>

          <StatusBadge status={ticketData.status as any} />
        </div>

        {/* Hero Live Ticket Card */}
        <div className="relative bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Queue Ticket
              </span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">
                Ticket #{ticketData.ticketNumber}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-400 font-semibold tracking-wide">
                Live Sync
              </span>
            </div>
          </div>

          {/* Status Specific Hero Display */}
          {isServing && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-emerald-400">
                At the Counter Right Now!
              </h3>
              <p className="text-xs text-emerald-200/80 max-w-sm mx-auto">
                This customer is currently at the service desk being attended to.
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">
                Service Completed
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                This ticket has been completed by {ticketData.shopName}.
              </p>
            </div>
          )}

          {isCancelled && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-red-400">
                Ticket Cancelled
              </h3>
              <p className="text-xs text-red-300/80 max-w-sm mx-auto">
                This ticket has been cancelled.
              </p>
            </div>
          )}

          {/* Metrics Grid (for waiting or in_progress) */}
          {isWaiting && (
            <div className="grid grid-cols-2 gap-4">
              {/* People ahead */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    People Ahead
                  </span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                    {ticketData.peopleAhead}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-medium">
                    {ticketData.peopleAhead === 0
                      ? "Next in line!"
                      : ticketData.peopleAhead === 1
                      ? "1 customer ahead"
                      : `${ticketData.peopleAhead} customers ahead`}
                  </div>
                </div>
              </div>

              {/* Estimated wait */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Est. Wait
                  </span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                    ~{ticketData.currentEstimatedWait}m
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-medium">
                    {ticketData.estimatedServiceStartTime
                      ? `Turn: ${new Date(ticketData.estimatedServiceStartTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Calculating estimate..."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Prediction Banner */}
          {isWaiting && ticketData.prediction?.rangeDisplay && (
            <div className="bg-blue-950/40 border border-blue-600/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-200">
                    Smart Prediction Window
                  </div>
                  <div className="text-xs text-blue-300/80 mt-0.5">
                    {ticketData.prediction.rangeDisplay} ({ticketData.prediction.confidenceLabel})
                  </div>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                {ticketData.prediction.confidence} Confidence
              </div>
            </div>
          )}

          {/* Services List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Selected Services</span>
              <span>Total ~{totalDuration} mins</span>
            </div>

            <div className="space-y-2">
              {ticketData.selectedServices.map((service, idx) => (
                <div
                  key={`${service.name}_${idx}`}
                  className="bg-slate-900/50 border border-slate-800/80 rounded-xl px-4 py-3 flex items-center justify-between text-sm"
                >
                  <span className="font-semibold text-slate-200">{service.name}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>⏱ {service.durationMin} mins</span>
                    {service.cost !== undefined && service.cost > 0 && (
                      <span className="text-emerald-400 font-bold">${service.cost}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copy link button */}
          <div className="pt-2">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 font-semibold text-sm transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Link Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-400" />
                  <span>Copy Live Tracking Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer info & branding */}
        <footer className="text-center space-y-4 pt-4 pb-12">
          <p className="text-xs text-slate-500">
            Guest tracking link strictly protects privacy. No customer personal information is accessible via this URL.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            <span>Powered by</span>
            <Link href="/" className="font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              QueueLess
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
