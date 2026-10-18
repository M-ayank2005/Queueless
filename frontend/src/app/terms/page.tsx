"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Clock, AlertTriangle, ShieldCheck, Store, ArrowLeft, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="border-b border-border pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <FileText className="w-3.5 h-3.5" />
              Terms of Service • Version v1.0.0
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              QueueLess Terms & Conditions
            </h1>
            <p className="mt-2 text-muted-foreground text-sm sm:text-base">
              Effective Date: October 18, 2026 • Last Updated: October 18, 2026
            </p>
          </div>

          {/* Owner Notice */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs sm:text-sm">
            <strong>Owner Notice:</strong> This document reflects the actual terms of using the QueueLess virtual line platform. It should be reviewed by legal counsel prior to formal commercial operations.
          </div>

          {/* Section 1 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">1. Agreement to Terms</CardTitle>
                <CardDescription>Binding agreement between user and QueueLess</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                By registering for an account, scanning a store queue QR code, or utilizing the QueueLess service, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, you must discontinue use of the platform immediately.
              </p>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">2. Platform Role & Store Relationships</CardTitle>
                <CardDescription>Independent virtual queuing intermediary</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                QueueLess provides queue management software connecting customers with independent businesses. QueueLess does not provide the underlying barber, salon, clinic, or retail services.
              </p>
              <p>
                All pricing, service delivery, and financial transactions take place in person directly between you and the participating merchant. Any billing disputes or service quality concerns must be resolved with the merchant directly.
              </p>
            </CardContent>
          </Card>

          {/* Section 3 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">3. Dynamic Wait Times & Estimates</CardTitle>
                <CardDescription>Understanding estimated waiting times</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                Estimated wait times displayed on tickets are calculated in real time based on cumulative service durations, quantities, and historical counter velocity.
              </p>
              <p>
                Because real-world appointments can vary in duration due to unforeseen customer needs, wait estimates are provided as reasonable estimates and cannot be guaranteed as exact appointment times.
              </p>
            </CardContent>
          </Card>

          {/* Section 4 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">4. Acceptable Conduct & Fair Queueing</CardTitle>
                <CardDescription>Rules preventing queue abuse</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                Users agree not to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Create duplicate or fraudulent queue tickets using automated scripts or scrapers.</li>
                <li>Attempt to manipulate counter verification tokens or forge queue positions.</li>
                <li>Interfere with merchant operations or harass counter personnel.</li>
              </ul>
              <p>
                QueueLess and store owners reserve the right to cancel tickets and suspend accounts that violate these rules.
              </p>
            </CardContent>
          </Card>

          {/* Section 5 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">5. Contact & Questions</CardTitle>
                <CardDescription>Inquiries regarding terms of service</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                If you have questions regarding these terms, please contact our legal and support team at:
              </p>
              <p className="flex items-center gap-2 pt-1 text-foreground font-medium">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:support@queueless.local" className="text-primary hover:underline">support@queueless.local</a>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
