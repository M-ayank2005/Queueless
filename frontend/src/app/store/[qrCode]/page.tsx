"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { Clock, Check, Store, MapPin, ArrowLeft, Ticket, AlertCircle } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
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

  useEffect(() => {
    if (qrCode) {
      fetchStore();
    }
  }, [qrCode]);

  const fetchStore = async () => {
    try {
      const res = await api.get(`/queue/store/${qrCode}`);
      setStore(res.data);
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
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
      if (error.response?.status === 401) {
        toast.info("Your session expired. Please sign in again.");
        router.push(`/login?redirect=/store/${qrCode}`);
      } else {
        toast.error(error.response?.data?.message || "Failed to join queue. The store may be closed.");
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
      <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-[#101A32] border-[#203052] text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-bold text-[#ECF2FF] mb-2">
              Store Not Found
            </CardTitle>
            <CardDescription className="text-xs text-[#889DC2] mb-6">
              The QR code or identifier "{qrCode}" did not match any active QueueLess merchants.
            </CardDescription>
            <div className="flex gap-3">
              <Link href="/scan" className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs">
                  Scan Another Code
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full border-[#203052] text-xs text-[#ECF2FF]">
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
    <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] pb-36">
      <Navbar />

      <main className="container mx-auto max-w-2xl px-4 pt-24">
        {/* Back navigation */}
        <Link
          href="/scan"
          className="inline-flex items-center gap-1.5 text-xs text-[#889DC2] hover:text-[#ECF2FF] mb-4 transition-colors"
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
          <Card className="bg-[#101A32] border-[#203052] shadow-xl mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-[#ECF2FF]">
                    {shopName}
                  </CardTitle>
                  {address && (
                    <CardDescription className="text-xs text-[#889DC2] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                      {address}
                    </CardDescription>
                  )}
                </div>
              </div>

              {hours?.openTime && hours?.closeTime && (
                <div className="mt-3 pt-3 border-t border-[#203052]/60 text-xs text-[#889DC2] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hours today: {hours.openTime} - {hours.closeTime}</span>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Service Selection List */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#ECF2FF] flex items-center gap-2">
              <Ticket className="w-4 h-4 text-blue-400" />
              Select Your Services
            </h2>
            <span className="text-xs text-[#889DC2]">
              {selectedServices.length} selected
            </span>
          </div>

          {servicesList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#203052] bg-[#101A32]/50 text-xs text-[#889DC2]">
              This merchant has not listed specific services yet.
            </div>
          ) : (
            <div className="space-y-3">
              {servicesList.map((service, idx) => {
                const isSelected = selectedServices.includes(idx);
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => toggleService(idx)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                        : "bg-[#101A32] border-[#203052] hover:border-[#203052]/90 hover:bg-[#152243]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-blue-600 border-blue-500"
                            : "border-[#203052] bg-[#0A1329]"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>

                      <div>
                        <p className="font-semibold text-sm text-[#ECF2FF]">{service.name}</p>
                        <p className="text-xs text-[#889DC2] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-blue-400" />
                          ~{service.durationMin} mins
                        </p>
                      </div>
                    </div>

                    <span className="font-bold text-sm text-[#ECF2FF]">
                      ${service.cost}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>

      {/* Fixed Checkout / Join Queue Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A1329]/95 backdrop-blur-xl border-t border-[#203052] p-4 z-30 shadow-2xl">
        <div className="container mx-auto max-w-2xl flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#889DC2] flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              ~{totalTime} mins estimated wait
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-[#ECF2FF]">
              Total: ${totalCost}
            </div>
          </div>

          <LoadingButton
            size="lg"
            disabled={selectedServices.length === 0}
            loading={isJoining}
            loadingText="Securing Spot..."
            onClick={handleJoinQueue}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-6 h-11 shadow-[0_0_20px_rgba(59,130,246,0.35)]"
          >
            Join Queue ({selectedServices.length})
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
