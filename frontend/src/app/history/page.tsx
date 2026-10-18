"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { 
  ArrowLeft,
  Search, 
  Receipt, 
  Calendar, 
  Clock, 
  Store, 
  MapPin, 
  Repeat, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  FileText,
  DollarSign,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { HistorySkeleton } from "@/components/loading";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface ServiceItem {
  name: string;
  duration?: number;
  cost?: number;
  price?: number;
  quantity?: number;
}

interface HistoryTicket {
  _id: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  selectedServices: ServiceItem[];
  date?: string;
  joinedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

export default function BookingHistoryPage() {
  const { user, status: authStatus } = useAuth();
  const [history, setHistory] = useState<HistoryTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [rebookingId, setRebookingId] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (authStatus === "authenticated") {
      fetchHistory();
    }
  }, [authStatus]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/queue/history");
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load booking history");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRebook = async (pastTicketId: string) => {
    setRebookingId(pastTicketId);
    try {
      const res = await api.post("/queue/quick-rebook", { pastTicketId });
      toast.success("Successfully rejoined queue!");
      router.push(`/status/${res.data._id}`);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Could not rebook. The store may be closed or you already have an active ticket."
      );
    } finally {
      setRebookingId(null);
    }
  };

  const getStoreName = (ticket: HistoryTicket) => {
    return (
      ticket.businessId?.businessProfile?.shopName ||
      ticket.businessId?.shopName ||
      "QueueLess Store"
    );
  };

  const getStoreAddress = (ticket: HistoryTicket) => {
    return (
      ticket.businessId?.businessProfile?.address ||
      ticket.businessId?.address ||
      null
    );
  };

  const filteredHistory = useMemo(() => {
    return history.filter((ticket) => {
      // Status filter
      if (statusFilter !== "all" && ticket.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const store = getStoreName(ticket).toLowerCase();
        const ticketId = ticket._id.toLowerCase();
        const ticketSuffix = ticket._id.slice(-4).toLowerCase();
        const services = (ticket.selectedServices || [])
          .map((s) => s.name.toLowerCase())
          .join(" ");

        return (
          store.includes(q) ||
          ticketId.includes(q) ||
          ticketSuffix.includes(q) ||
          services.includes(q)
        );
      }

      return true;
    });
  }, [history, searchQuery, statusFilter]);

  // Aggregate stats
  const completedCount = useMemo(() => {
    return history.filter((h) => h.status === "completed").length;
  }, [history]);

  const totalSpent = useMemo(() => {
    return history.reduce((acc, h) => {
      const ticketTotal = (h.selectedServices || []).reduce(
        (sub, s) => sub + (Number(s.cost || s.price || 0) * (Number(s.quantity) || 1)),
        0
      );
      return acc + ticketTotal;
    }, 0);
  }, [history]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Top Navigation / Breadcrumbs */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Profile
          </Link>
          <span className="text-xs text-muted-foreground">
            Customer Archive
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Booking History
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Archived visits, completed appointments, and digital queue tickets
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Link href="/scan">
              <Button size="sm" className="gap-2">
                Join New Queue
              </Button>
            </Link>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-2">
              <span>Total Visits Recorded</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : history.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Historical counter tickets on record
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-2">
              <span>Completed Visits</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : completedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully served at counter
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-2">
              <span>Total Service Value</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : `$${totalSpent.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated receipts total
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by store, service, or ticket #..."
              className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/80 border border-border self-start sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({history.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "completed"
                  ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("cancelled")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "cancelled"
                  ? "bg-card text-rose-600 dark:text-rose-400 shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cancelled ({history.filter((h) => h.status === "cancelled").length})
            </button>
          </div>
        </div>

        {/* History List */}
        {loading ? (
          <HistorySkeleton count={4} />
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-border rounded-2xl bg-card/60">
            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground mx-auto mb-4 shadow-sm">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              {searchQuery || statusFilter !== "all"
                ? "No Matching Bookings Found"
                : "No Past Visits Yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search keywords or resetting the status filters."
                : "When you join store queues and complete visits, your archival records and receipts will be stored here."}
            </p>
            {searchQuery || statusFilter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Reset Filters
              </Button>
            ) : (
              <Link href="/scan">
                <Button size="sm" className="gap-2">
                  Find Stores to Queue Up
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredHistory.map((ticket) => {
                const shopName = getStoreName(ticket);
                const address = getStoreAddress(ticket);
                const dateVal = ticket.date || ticket.joinedAt || ticket.createdAt;
                const formattedDate = dateVal
                  ? new Date(dateVal).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recent Visit";

                const ticketTotal = (ticket.selectedServices || []).reduce(
                  (acc, s) => acc + (Number(s.cost || s.price || 0) * (Number(s.quantity) || 1)),
                  0
                );

                return (
                  <motion.div
                    key={ticket._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left Column: Store Details and Services */}
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <StatusBadge status={ticket.status} />
                          <span className="text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border">
                            Ticket #{ticket._id.slice(-4).toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formattedDate}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            {shopName}
                          </h3>
                          {address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-primary shrink-0" />
                              <span className="truncate">{address}</span>
                            </p>
                          )}
                        </div>

                        {/* Services List / Chips */}
                        {ticket.selectedServices?.length ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {ticket.selectedServices.map((service, idx) => (
                              <div
                                key={`${service.name}_${idx}`}
                                className="px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-xs text-foreground font-medium flex items-center gap-1.5"
                              >
                                <span>{service.name}</span>
                                {service.cost ? (
                                  <span className="text-muted-foreground font-semibold">
                                    ${service.cost}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {/* Right Column: Price & Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-border gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-xs text-muted-foreground block">
                            Total Bill
                          </span>
                          <span className="text-xl font-extrabold text-foreground">
                            ${ticketTotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rebookingId === ticket._id}
                            onClick={() => handleQuickRebook(ticket._id)}
                            className="border-border hover:bg-primary/10 hover:border-primary/40 text-xs text-primary font-medium flex items-center gap-1.5 h-8 px-3"
                            title="Rebook queue with identical services"
                          >
                            <Repeat className={`w-3.5 h-3.5 ${rebookingId === ticket._id ? "animate-spin" : ""}`} />
                            {rebookingId === ticket._id ? "Rebooking..." : "Rebook"}
                          </Button>

                          <Link href={`/status/${ticket._id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border hover:bg-secondary text-xs font-medium flex items-center gap-1 h-8 px-2.5"
                              title="View receipt and ticket status"
                            >
                              <span>Details</span>
                              <ExternalLink className="w-3.5 h-3.5 ml-0.5 text-muted-foreground" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
