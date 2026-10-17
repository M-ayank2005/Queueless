"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/Toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QueueFlowLoader, LoadingButton } from "@/components/loading";
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Store, 
  Edit3, 
  LogOut, 
  Lock, 
  Clock, 
  MapPin, 
  ArrowRight,
  QrCode,
  Calendar,
  X,
  Sun,
  Moon,
  Palette,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, Theme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

interface UserProfile {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "business" | string;
  createdAt?: string;
  businessProfile?: {
    shopName?: string;
    address?: string;
    uniqueQrCode?: string;
    workingHours?: {
      openTime: string;
      closeTime: string;
      closedDays: string[];
    };
  };
}

export default function ProfilePage() {
  const { user: authUser, status, logout, updateUser: updateAuthUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeQueuesCount, setActiveQueuesCount] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const fetchProfile = async () => {
      if (status !== "authenticated") return;

      if (authUser) {
        setUser(authUser as any);
        setFormData({
          name: authUser.name || "",
          phone: authUser.phone || "",
          password: ""
        });
      }

      try {
        const res = await api.get("/auth/profile");
        const profileData = res.data;

        const mergedUser: UserProfile = {
          _id: profileData._id || authUser?.id || authUser?._id,
          name: profileData.name || authUser?.name || "User",
          email: profileData.email || authUser?.email || "",
          phone: profileData.phone || authUser?.phone || "",
          role: profileData.role || authUser?.role || "customer",
          createdAt: profileData.createdAt,
          businessProfile: profileData.businessProfile || authUser?.businessProfile
        };

        setUser(mergedUser);
        updateAuthUser(mergedUser as any);
        setFormData({
          name: mergedUser.name,
          phone: mergedUser.phone || "",
          password: ""
        });
      } catch (err) {
        console.warn("Could not fetch remote profile, using cached data if available", err);
      } finally {
        setLoading(false);
      }

      // Fetch user queue counts for activity overview
      try {
        const myQueuesRes = await api.get("/queue/my-queues");
        if (Array.isArray(myQueuesRes.data)) {
          const active = myQueuesRes.data.filter(
            (q: any) => q.status === "waiting" || q.status === "in_progress"
          ).length;
          setActiveQueuesCount(active);
        }
      } catch {}

      try {
        const historyRes = await api.get("/queue/history");
        if (Array.isArray(historyRes.data)) {
          setHistoryCount(historyRes.data.length);
        }
      } catch {}
    };

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await api.put("/auth/profile", payload);
      const updated = res.data.user || res.data;

      const newUser: UserProfile = {
        ...user!,
        name: updated.name || formData.name,
        phone: updated.phone || formData.phone
      };

      setUser(newUser);
      updateAuthUser(newUser as any);

      toast.success("Profile updated successfully");
      setIsEditOpen(false);
      setFormData(prev => ({ ...prev, password: "" }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.info("Logged out successfully");
    router.replace("/login");
  };

  if (loading) {
    return (
      <QueueFlowLoader
        variant="page"
        size="lg"
        message="Loading account profile..."
        submessage="Retrieving user credentials and settings"
      />
    );
  }

  if (!user) return null;

  const isMerchant = user.role === "business";

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 transition-colors duration-150">
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 pt-24">
        {/* Header Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-primary bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                  <UserIcon className="w-10 h-10" />
                </div>
                <div 
                  className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                    isMerchant 
                      ? "bg-primary text-white border-primary" 
                      : "bg-emerald-600 text-white border-emerald-600"
                  }`}
                >
                  {isMerchant ? "Merchant" : "Customer"}
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {user.name || "User Account"}
                </h1>
                {user.email ? (
                  <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    {user.email}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    No email on record
                  </p>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border text-foreground">
                    {isMerchant ? (
                      <>
                        <Store className="w-3 h-3 text-primary" />
                        Business Account
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        Customer Account
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsEditOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4 text-primary" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Main Grid: Details + Role Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Account Information Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary" />
                Account Information
              </CardTitle>
              <CardDescription className="text-xs">
                Your personal details registered with QueueLess.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/40 text-sm">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium text-foreground">{user.name || "Not specified"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/40 text-sm">
                <span className="text-muted-foreground">Email Address</span>
                <span className="font-medium text-foreground">{user.email || "Not specified"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/40 text-sm">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="font-medium text-foreground">
                  {user.phone ? user.phone : <span className="text-muted-foreground italic">Not added</span>}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm">
                <span className="text-muted-foreground">Account Type</span>
                <span className="font-medium text-foreground capitalize">{user.role}</span>
              </div>
            </CardContent>
          </Card>

          {/* Role-Specific Overview Card */}
          {isMerchant ? (
            /* Merchant Store Overview */
            <Card className="shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" />
                    Business & Store Profile
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Operational status and public store details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border/40 text-sm">
                    <span className="text-muted-foreground">Shop Name</span>
                    <span className="font-medium text-foreground">
                      {user.businessProfile?.shopName || "My Store"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/40 text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> Address
                    </span>
                    <span className="font-medium text-foreground truncate max-w-[200px]">
                      {user.businessProfile?.address || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/40 text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Working Hours
                    </span>
                    <span className="font-medium text-foreground">
                      {user.businessProfile?.workingHours?.openTime && user.businessProfile?.workingHours?.closeTime
                        ? `${user.businessProfile.workingHours.openTime} - ${user.businessProfile.workingHours.closeTime}`
                        : "Open 24/7"}
                    </span>
                  </div>
                </CardContent>
              </div>
              <div className="p-6 pt-0">
                <Link href="/dashboard">
                  <Button className="w-full flex items-center justify-center gap-2">
                    Go to Business Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            /* Customer Activity Overview */
            <Card className="shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    Queue Activity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Summary of your digital bookings and visits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-secondary border border-border text-center">
                      <div className="text-2xl font-bold text-primary">
                        {activeQueuesCount ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Active Tickets</div>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary border border-border text-center">
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {historyCount ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Past Bookings</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Track your current position in line or discover new stores to join digital queues without waiting on site.
                  </p>
                </CardContent>
              </div>
              <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    View My Queues
                  </Button>
                </Link>
                <Link href="/scan" className="flex-1">
                  <Button className="w-full flex items-center justify-center gap-1.5">
                    <QrCode className="w-4 h-4" />
                    Scan & Join
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Phase 6 Non-Negotiable: Appearance & Theme Settings Card */}
        <Card className="shadow-xs mb-8" id="appearance-settings">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Appearance & Theme Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Choose your interface theme. Your preference is persisted across restarts and browser sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div 
              role="radiogroup" 
              aria-label="Theme selection" 
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {/* Light Mode Option */}
              <button
                type="button"
                role="radio"
                aria-checked={theme === "light"}
                onClick={() => setTheme("light")}
                className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  theme === "light"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      theme === "light" 
                        ? "bg-amber-500/15 text-amber-600 border border-amber-500/30" 
                        : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-base">Light Mode</div>
                      <div className="text-xs text-muted-foreground mt-0.5">High-contrast daytime clarity (Default)</div>
                    </div>
                  </div>
                  {theme === "light" && (
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Light Mode Mini Preview */}
                <div className="w-full rounded-xl p-3 bg-slate-50 border border-slate-200 shadow-inner flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-2 rounded bg-slate-300" />
                    <div className="w-8 h-2 rounded-full bg-blue-600" />
                  </div>
                  <div className="w-full h-7 rounded-lg bg-white border border-slate-200 p-1.5 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-slate-200" />
                    <div className="w-20 h-2 rounded bg-slate-300" />
                  </div>
                </div>
              </button>

              {/* Dark Mode Option */}
              <button
                type="button"
                role="radio"
                aria-checked={theme === "dark"}
                onClick={() => setTheme("dark")}
                className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  theme === "dark"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      theme === "dark" 
                        ? "bg-primary/20 text-blue-400 border border-primary/30" 
                        : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-base">Dark Mode</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Sleek midnight palette for dark environments</div>
                    </div>
                  </div>
                  {theme === "dark" && (
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Dark Mode Mini Preview */}
                <div className="w-full rounded-xl p-3 bg-[#070D18] border border-[#1E2D4A] shadow-inner flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-2 rounded bg-[#1E2D4A]" />
                    <div className="w-8 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div className="w-full h-7 rounded-lg bg-[#0C1425] border border-[#1E2D4A] p-1.5 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#1E2D4A]" />
                    <div className="w-20 h-2 rounded bg-slate-500" />
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/40">
              <span>Active Theme: <strong className="text-foreground capitalize">{theme} Mode</strong></span>
              <span>Changes apply instantly without page reload</span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone & Logout Section */}
        <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <LogOut className="w-4 h-4 text-primary" />
                Session Management
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Log out of your current session on this device.
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4 text-primary" />
              Sign Out
            </Button>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-50 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-profile-title"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 id="edit-profile-title" className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  Edit Profile Details
                </h2>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs text-foreground font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your Full Name"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                    <span>Email Address</span>
                    <span className="text-[10px] text-primary">Managed via login</span>
                  </Label>
                  <Input
                    id="edit-email"
                    value={user.email}
                    disabled
                    className="cursor-not-allowed opacity-70 bg-muted"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-xs text-foreground font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Phone Number
                  </Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-password" className="text-xs text-foreground font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    New Password
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to keep unchanged"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Only enter a value if you wish to reset your account password.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditOpen(false)}
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    type="submit"
                    loading={isSubmitting}
                    loadingText="Saving Changes..."
                    className="min-w-[140px]"
                  >
                    Save Changes
                  </LoadingButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
