"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import QRScanner from "@/components/QRScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { QrCode, Keyboard, ArrowRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ScanPage() {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) {
      toast.error("Please enter a valid store code or URL");
      return;
    }

    // If a full URL was pasted
    if (trimmed.includes("/store/")) {
      const parts = trimmed.split("/store/");
      if (parts[1]) {
        router.push(`/store/${parts[1]}`);
        return;
      }
    }

    router.push(`/store/${trimmed}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 flex flex-col">
      <Navbar />

      <main className="container mx-auto max-w-md px-4 pt-24 flex-1 flex flex-col justify-center">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>

          <h1 className="text-2xl font-extrabold text-foreground">
            Join Store Queue
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Scan the storefront QR code or enter the merchant code manually.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-5 p-1 rounded-xl bg-muted border border-border">
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "camera"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <QrCode className="w-4 h-4" />
              Scan QR
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "manual"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Enter Code
            </button>
          </div>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "camera" ? (
            <QRScanner />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="store-code" className="text-xs font-semibold text-foreground block">
                    Store Code or Link
                  </label>
                  <Input
                    id="store-code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    className="bg-card border-border text-xs text-foreground font-mono focus:border-primary"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Find this on the merchant's physical standee or URL.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 h-10 shadow-sm"
                >
                  Visit Store
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
