"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Lock, Eye, Cpu, Database, UserCheck, ArrowLeft, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPolicyPage() {
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
              <Shield className="w-3.5 h-3.5" />
              Legal & Privacy Notice • Version v1.0.0
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              QueueLess Privacy Policy
            </h1>
            <p className="mt-2 text-muted-foreground text-sm sm:text-base">
              Effective Date: October 18, 2026 • Last Updated: October 18, 2026
            </p>
          </div>

          {/* Owner Review Alert */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs sm:text-sm">
            <strong>Owner Notice:</strong> This draft policy reflects the actual technical implementation and data processing of the QueueLess application. Legal counsel should review operational details (registered entity name, jurisdictional requirements) before deployment to production.
          </div>

          {/* Section 1 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">1. Information We Collect</CardTitle>
                <CardDescription>Only the data necessary to provide seamless virtual queuing</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Account Credentials:</strong> When you register as a customer or merchant, we collect your name, email address, phone number, and a salted bcrypt password hash. We never store plain-text passwords.
              </p>
              <p>
                <strong>Queue & Ticket Records:</strong> When you join a queue, we record the selected services, requested quantities, ticket entry timestamps, estimated wait duration, queue status, and an encrypted counter verification token.
              </p>
              <p>
                <strong>Business Profiles:</strong> For participating merchants, we store the store name, physical address, service catalog, operating hours, and unique queue QR codes.
              </p>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">2. How We Use Your Information</CardTitle>
                <CardDescription>Powering real-time line management and status updates</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                We use collected information strictly to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Manage your position in live virtual queues and calculate real-time wait estimates.</li>
                <li>Verify your spot at the counter using cryptographic QR codes (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">ql-ticket:*</code>) without leaking personal identifying information to strangers in line.</li>
                <li>Enable merchants to contact you directly via phone call or SMS when your turn is called.</li>
                <li>Provide personalized customer support through our AI assistant and help desk.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 3 - Gemini AI Processing */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">3. AI Support & Third-Party Processing (Google Gemini)</CardTitle>
                <CardDescription>Transparent disclosure regarding automated assistance</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                QueueLess offers an automated AI Support assistant powered by Google&apos;s Gemini API to provide instant answers to questions regarding queue status, tickets, and store workflows.
              </p>
              <p>
                <strong>Personalized Support Context:</strong> To answer inquiries about your line position, the backend retrieves a sanitized snapshot of your own active tickets (e.g. ticket ID, status, services requested).
              </p>
              <p>
                <strong>Data Minimization & Safety:</strong> We NEVER transmit password hashes, session tokens, verification secrets, or other customers&apos; tickets to the AI provider. Inquiries are subject to Google Cloud&apos;s API terms and privacy guidelines. Conversations are short-lived and used only for resolving your immediate support question.
              </p>
            </CardContent>
          </Card>

          {/* Section 4 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">4. Data Security & Storage</CardTitle>
                <CardDescription>Protection protocols and storage standards</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                All network communication occurs over encrypted HTTPS/TLS. Authentication credentials use industry-standard JSON Web Tokens (JWT) with strict expiration policies. Counter verification tokens and share tokens are hashed using SHA-256 before storage to prevent tampering.
              </p>
              <p>
                We do not sell, rent, or monetize your personal information to advertisers or data brokers.
              </p>
            </CardContent>
          </Card>

          {/* Section 5 */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">5. Your Privacy Rights & Contact</CardTitle>
                <CardDescription>Managing your account and data choices</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                You may review or update your name, email, and phone number at any time through your Profile Settings. You may also request account deletion or data erasure by contacting our privacy coordinator.
              </p>
              <p className="flex items-center gap-2 pt-2 text-foreground font-medium">
                <Mail className="w-4 h-4 text-primary" />
                Contact us: <a href="mailto:support@queueless.local" className="text-primary hover:underline">support@queueless.local</a>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
