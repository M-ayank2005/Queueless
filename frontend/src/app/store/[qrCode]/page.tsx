"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Check, 
  Store, 
  MapPin, 
  ArrowLeft, 
  Ticket, 
  AlertCircle, 
  Heart,
  Plus,
  Minus,
  Edit3,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { QueueFlowLoader, LoadingButton } from "@/components/loading";

interface ServiceItem {
  _id?: string;
  name: string;
  durationMin: number;
  cost: number;
}

interface ActiveTicketData {
  _id: string;
  status: string;
  selectedServices: Array<{
    name: string;
    durationMin: number;
    cost: number;
    quantity?: number;
  }>;
  joinedAt: string;
  peopleAhead?: number;
  currentEstimatedWait?: number;
  verifiedAt?: string;
}

interface StoreData {
  _id: string;
  name?: string;
  email?: string;
  isFavorite?: boolean;
  activeTicket?: ActiveTicketData | null;
  businessProfile?: {
    shopName?: string;
    address?: string;
    services?: ServiceItem[];
    workingHours?: {
      openTime: string;
      closeTime: string;
      closedDays: number[];
    };
  };
}

export default function StorePage() {
  const params = useParams();
  const qrCode = params.qrCode as string;
  const router = useRouter();
  const { toast } = useToast();

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [activeTicket, setActiveTicket] = useState<ActiveTicketData | null>(null);
  const [isEditingActive, setIsEditingActive] = useState(false);

  useEffect(() => {
    if (qrCode) {
      fetchStore();
    }
  }, [qrCode]);

  const fetchStore = async () => {
    try {
      const res = await api.get(`/queue/store/${qrCode}`);
      setStore(res.data);
      setIsFavorite(Boolean(res.data.isFavorite));
      if (res.data.activeTicket) {
        setActiveTicket(res.data.activeTicket);
      }
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      toast.info("Please sign in to save this merchant to your favourites");
      return;
    }
    if (!store?._id || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      const res = await api.post("/queue/favorites/toggle", { businessId: store._id });
      const nextFav = Boolean(res.data.isFavorite);
      setIsFavorite(nextFav);
      if (nextFav) {
        toast.success("Saved to your favourites!");
      } else {
        toast.info("Removed from your favourites");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update favourites");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const servicesList = store?.businessProfile?.services || [];

  const handleIncrement = (serviceName: string) => {
    setServiceQuantities(prev => ({
      ...prev,
      [serviceName]: Math.min(50, (prev[serviceName] || 0) + 1)
    }));
  };

  const handleDecrement = (serviceName: string) => {
    setServiceQuantities(prev => {
      const current = prev[serviceName] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[serviceName];
        return copy;
      }
      return { ...prev, [serviceName]: current - 1 };
    });
  };

  const handleStartEditing = () => {
    if (!activeTicket) return;
    const initialQty: Record<string, number> = {};
    for (const s of activeTicket.selectedServices || []) {
      initialQty[s.name] = s.quantity || 1;
    }
    setServiceQuantities(initialQty);
    setIsEditingActive(true);
    toast.info("Adjust your service quantities below, then tap Save Updated Services.");
  };

  const selectedCount = useMemo(() => {
    return Object.values(serviceQuantities).reduce((acc, q) => acc + q, 0);
  }, [serviceQuantities]);

  const totalCost = useMemo(() => {
    return Object.entries(serviceQuantities).reduce((acc, [name, qty]) => {
      const found = servicesList.find(s => s.name === name);
      return acc + (found?.cost || 0) * qty;
    }, 0);
  }, [serviceQuantities, servicesList]);

  const totalTime = useMemo(() => {
    return Object.entries(serviceQuantities).reduce((acc, [name, qty]) => {
      const found = servicesList.find(s => s.name === name);
      return acc + (found?.durationMin || 0) * qty;
    }, 0);
  }, [serviceQuantities, servicesList]);

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      toast.info("Please select at least one service with quantity 1 or more");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      toast.info("Please sign in or create an account to book your queue ticket");
      router.push(`/login?redirect=/store/${qrCode}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadServices = Object.entries(serviceQuantities).map(([name, quantity]) => ({
        name,
        quantity
      }));

      if (isEditingActive && activeTicket?._id) {
        const res = await api.put(`/queue/${activeTicket._id}/services`, {
          selectedServices: payloadServices
        });
        toast.success("Services updated successfully!");
        router.push(`/status/${activeTicket._id}`);
      } else {
        const res = await api.post("/queue/join", {
          businessId: store?._id,
          selectedServices: payloadServices
        });
        toast.success("Joined queue successfully!");
        router.push(`/status/${res.data._id}`);
      }
    } catch (error: any) {
      const normalized = normalizeApiError(error);
      if (normalized.isUnauthorized) {
        toast.info("Your session expired. Please sign in again.");
        router.push(`/login?redirect=/store/${qrCode}`);
      } else if (normalized.isConflict && (normalized.activeTicketId || (error.response?.data?.error?.activeTicket))) {
        const ticketData = error.response?.data?.error?.activeTicket || { _id: normalized.activeTicketId, status: "waiting" };
        setActiveTicket(ticketData);
        toast.info("You already have an active ticket at this store. You can view or edit your services.");
      } else {
        toast.error(normalized.message || "Failed to process request. The store may be closed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <QueueFlowLoader
        variant="page"
        size="lg"
        message="Checking store menu..."
        submessage="Retrieving active services and estimated wait times"
      />
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-card border-border text-center p-6 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-bold text-foreground mb-2">
              Store Not Found
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mb-6">
              The QR code or identifier "{qrCode}" did not match any active QueueLess merchants.
            </CardDescription>
            <div className="flex gap-3">
              <Link href="/scan" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-sm">
                  Scan Another Code
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full border-border text-xs text-foreground">
                  Back to Home
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const shopName = store.businessProfile?.shopName || "QueueLess Store";
  const address = store.businessProfile?.address;
  const hours = store.businessProfile?.workingHours;

  return (
    <div className="min-h-screen bg-background text-foreground pb-40">
      <Navbar />

      <main className="container mx-auto max-w-2xl px-4 pt-24">
        {/* Back navigation */}
        <Link
          href="/scan"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Scanner
        </Link>

        {/* Active Ticket Banner on Repeat Scan */}
        {activeTicket && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    #{activeTicket._id.slice(-4).toUpperCase()}
                  </span>
                  <h3 className="font-bold text-sm text-foreground">
                    You're Already in Line at this Store!
                  </h3>
                  <StatusBadge status={activeTicket.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEditingActive 
                    ? "Editing your active ticket services below. Your spot in line is safely preserved."
                    : "You already hold an active spot in this queue. Would you like to view your live ticket or adjust your requested services?"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isEditingActive ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleStartEditing}
                      className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 text-xs h-9 rounded-xl flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Services
                    </Button>
                    <Link href={`/status/${activeTicket._id}`}>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-xs"
                      >
                        <span>View Ticket</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingActive(false);
                      setServiceQuantities({});
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground h-9"
                  >
                    Cancel Editing
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Store Header Banner Card */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-card border-border/70 shadow-xs rounded-2xl mb-6">
            <CardHeader className="p-5 sm:p-6">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                      {shopName}
                    </CardTitle>
                    {address && (
                      <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        {address}
                      </CardDescription>
                    )}
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={handleToggleFavorite}
                  disabled={isTogglingFavorite}
                  title={isFavorite ? "Remove from saved stores" : "Save store to favourites"}
                  aria-label={isFavorite ? "Remove from saved stores" : "Save store to favourites"}
                  className={`p-2.5 rounded-xl border transition-all shrink-0 flex items-center justify-center ${
                    isFavorite
                      ? "bg-rose-500/15 border-rose-500/35 text-rose-500 shadow-xs"
                      : "bg-card border-border/70 text-muted-foreground hover:text-rose-500 hover:border-rose-500/30"
                  }`}
                >
                  <Heart className={`w-5 h-5 transition-transform ${isFavorite ? "fill-rose-500 text-rose-500 scale-105" : ""}`} />
                </motion.button>
              </div>

              {hours?.openTime && hours?.closeTime && (
                <div className="mt-4 pt-3.5 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Operating Hours: {hours.openTime} - {hours.closeTime}</span>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Service Selection List with Quantity Steppers */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              {isEditingActive ? "Modify Your Services" : "Select Your Services"}
            </h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/40">
              {selectedCount} item{selectedCount === 1 ? "" : "s"} selected
            </span>
          </div>

          {servicesList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-card/50 text-xs text-muted-foreground">
              This merchant has not listed specific services yet.
            </div>
          ) : (
            <div className="space-y-3">
              {servicesList.map((service, idx) => {
                const quantity = serviceQuantities[service.name] || 0;
                const isSelected = quantity > 0;

                return (
                  <motion.div
                    key={idx}
                    layout
                    className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-primary/8 border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-card border-border/70 hover:border-border"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">{service.name}</p>
                        {quantity > 1 && (
                          <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary">
                            ×{quantity}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          ~{service.durationMin * (quantity || 1)} mins
                          {quantity > 1 && <span className="opacity-70">({service.durationMin}m ea)</span>}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-foreground">
                          ${service.cost * (quantity || 1)}
                          {quantity > 1 && <span className="text-muted-foreground font-normal"> (${service.cost} ea)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected ? (
                        <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleDecrement(service.name)}
                            className="w-7 h-7 rounded-lg bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-colors active:scale-90"
                            aria-label={`Decrease ${service.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold font-mono text-foreground">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrement(service.name)}
                            className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors active:scale-90"
                            aria-label={`Increase ${service.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleIncrement(service.name)}
                          className="h-8 text-xs px-3 rounded-xl border-border/80 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>

      {/* Fixed Checkout / Join Queue Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl border-t border-border/60 py-3.5 px-4 z-30 shadow-xs">
        <div className="container mx-auto max-w-2xl flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              ~{totalTime} mins total service time
            </div>
            <div className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              Total: ${totalCost}
            </div>
          </div>

          <LoadingButton
            size="lg"
            disabled={selectedCount === 0}
            loading={isSubmitting}
            loadingText={isEditingActive ? "Updating Ticket..." : "Securing Spot..."}
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/95 text-white font-semibold text-sm px-6 h-11 rounded-xl shadow-xs transition-transform active:scale-[0.98]"
          >
            {isEditingActive 
              ? `Save Updated Services (${selectedCount})` 
              : `Join Queue (${selectedCount})`}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
