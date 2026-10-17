"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { Clock, Check, Store, MapPin, ArrowLeft, Ticket, AlertCircle, Heart } from "lucide-react";
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

interface StoreData {
  _id: string;
  name?: string;
  email?: string;
  isFavorite?: boolean;
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
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

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

  const toggleService = (index: number) => {
    if (selectedServices.includes(index)) {
      setSelectedServices(selectedServices.filter((i) => i !== index));
    } else {
      setSelectedServices([...selectedServices, index]);
    }
  };

  const servicesList = store?.businessProfile?.services || [];
  const totalCost = selectedServices.reduce((acc, idx) => acc + (servicesList[idx]?.cost || 0), 0);
  const totalTime = selectedServices.reduce((acc, idx) => acc + (servicesList[idx]?.durationMin || 0), 0);

  const handleJoinQueue = async () => {
    if (selectedServices.length === 0) {
      toast.info("Please select at least one service to join the queue");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("Please sign in or create an account to book your queue ticket");
      router.push(`/login?redirect=/store/${qrCode}`);
      return;
    }

    setIsJoining(true);
    try {
      const selectedServiceObjects = selectedServices.map((idx) => servicesList[idx]);
      const res = await api.post("/queue/join", {
        businessId: store?._id,
        selectedServices: selectedServiceObjects
      });

      toast.success("Joined queue successfully!");
      router.push(`/status/${res.data._id}`);
    } catch (error: any) {
      const normalized = normalizeApiError(error);
      if (normalized.isUnauthorized) {
        toast.info("Your session expired. Please sign in again.");
        router.push(`/login?redirect=/store/${qrCode}`);
      } else if (normalized.isConflict && normalized.activeTicketId) {
        toast.info("You already have an active ticket at this store. Redirecting to your ticket...");
        router.push(`/status/${normalized.activeTicketId}`);
      } else {
        toast.error(normalized.message || "Failed to join queue. The store may be closed.");
      }
    } finally {
      setIsJoining(false);
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
    <div className="min-h-screen bg-background text-foreground pb-36">
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

          {/* Service Selection List */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              Select Your Services
            </h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/40">
              {selectedServices.length} selected
            </span>
          </div>

          {servicesList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-card/50 text-xs text-muted-foreground">
              This merchant has not listed specific services yet.
            </div>
          ) : (
            <div className="space-y-3">
              {servicesList.map((service, idx) => {
                const isSelected = selectedServices.includes(idx);
                return (
                  <motion.div
                    key={idx}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => toggleService(idx)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                      isSelected
                        ? "bg-primary/8 border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-card border-border/70 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-primary border-primary shadow-xs"
                            : "border-border/80 bg-background"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>

                      <div>
                        <p className="font-semibold text-sm text-foreground">{service.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-primary" />
                          ~{service.durationMin} mins
                        </p>
                      </div>
                    </div>

                    <span className="font-bold text-sm text-foreground tracking-tight">
                      ${service.cost}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>

      {/* Fixed Checkout / Join Queue Bottom Bar (Apple Frosted Glass) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl border-t border-border/60 py-3.5 px-4 z-30 shadow-xs">
        <div className="container mx-auto max-w-2xl flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              ~{totalTime} mins estimated wait
            </div>
            <div className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              Total: ${totalCost}
            </div>
          </div>

          <LoadingButton
            size="lg"
            disabled={selectedServices.length === 0}
            loading={isJoining}
            loadingText="Securing Spot..."
            onClick={handleJoinQueue}
            className="bg-primary hover:bg-primary/95 text-white font-semibold text-sm px-6 h-11 rounded-xl shadow-xs transition-transform active:scale-[0.98]"
          >
            Join Queue ({selectedServices.length})
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
