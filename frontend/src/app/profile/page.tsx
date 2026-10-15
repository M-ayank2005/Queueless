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
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Store, 
  Edit3, 
  LogOut, 
  Trash2, 
  Lock, 
  Clock, 
  MapPin, 
  ArrowRight,
  QrCode,
  Calendar,
  AlertTriangle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeQueuesCount, setActiveQueuesCount] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      let cachedUser: any = null;

      if (!storedToken) {
        router.push("/login?redirect=/profile");
        return;
      }

      if (storedUser) {
        try {
          cachedUser = JSON.parse(storedUser);
          setUser(cachedUser);
          setFormData({
            name: cachedUser.name || "",
            phone: cachedUser.phone || "",
            password: ""
          });
        } catch {}
      }

      try {
        const res = await api.get("/auth/profile");
        const profileData = res.data;

        const mergedUser: UserProfile = {
          _id: profileData._id || cachedUser?.id || cachedUser?._id,
          name: profileData.name || cachedUser?.name || "User",
          email: profileData.email || cachedUser?.email || "No email on record",
          phone: profileData.phone || cachedUser?.phone || "",
          role: profileData.role || cachedUser?.role || "customer",
          businessProfile: profileData.businessProfile || cachedUser?.businessProfile
        };

        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
        window.dispatchEvent(new Event("auth_login"));
        setFormData({
          name: mergedUser.name,
          phone: mergedUser.phone || "",
          password: ""
        });

        // If customer, fetch quick booking stats
        if (mergedUser.role === "customer") {
          try {
            const [activeRes, historyRes] = await Promise.all([
              api.get("/queue/my-queues"),
              api.get("/queue/history")
            ]);
            setActiveQueuesCount(Array.isArray(activeRes.data) ? activeRes.data.length : 0);
            setHistoryCount(Array.isArray(historyRes.data) ? historyRes.data.length : 0);
          } catch {
            // Non-blocking
          }
        }
      } catch (err: any) {
        // Fallback to localStorage if network error
        if (cachedUser) {
          setUser(cachedUser);
        } else {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

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
        phone: formData.phone.trim() 
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await api.put("/auth/profile", payload);
      const updatedUser = res.data;

      if (updatedUser.token) {
        localStorage.setItem("token", updatedUser.token);
      }
      
      const newStorageUser = {
        id: updatedUser._id || user?._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        businessProfile: updatedUser.businessProfile || user?.businessProfile
      };
      localStorage.setItem("user", JSON.stringify(newStorageUser));
      
      setUser((prev) => prev ? { ...prev, ...updatedUser } : updatedUser);
      setIsEditOpen(false);
      setFormData(prev => ({ ...prev, password: "" }));
      
      window.dispatchEvent(new Event("auth_login"));
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth_logout"));
    toast.info("Logged out successfully");
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.delete("/auth/profile");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth_logout"));
      toast.success("Account deleted successfully");
      router.push("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete account");
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#889DC2]">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "QL";

  const isMerchant = user.role === "business";

  return (
    <div className="min-h-screen bg-[#050B18] text-[#ECF2FF] pb-16">
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 pt-24">
        {/* Header Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#203052] bg-[#101A32] p-6 sm:p-8 shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-blue-500 bg-[#0A1329] flex items-center justify-center text-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.25)]">
                  <UserIcon className="w-10 h-10" />
                </div>
                <div 
                  className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-md ${
                    isMerchant 
                      ? "bg-blue-950 text-blue-300 border-blue-500/50" 
                      : "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                  }`}
                >
                  {isMerchant ? "Merchant" : "Customer"}
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ECF2FF]">
                  {user.name || "User Account"}
                </h1>
                {user.email ? (
                  <p className="text-sm text-[#889DC2] flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    {user.email}
                  </p>
                ) : (
                  <p className="text-xs text-[#889DC2] italic mt-1">
                    No email on record
                  </p>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#152243] border border-[#203052] text-[#C5D5F5]">
                    {isMerchant ? (
                      <>
                        <Store className="w-3 h-3 text-blue-400" />
                        Business Account
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Customer Account
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2 bg-[#152243] hover:bg-[#1f3160] text-[#ECF2FF] border border-[#203052] transition-colors"
            >
              <Edit3 className="w-4 h-4 text-blue-400" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Main Grid: Details + Role Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Account Information Card */}
          <Card className="bg-[#101A32] border-[#203052] shadow-md">
            <CardHeader className="pb-3 border-b border-[#203052]/60">
              <CardTitle className="text-lg font-semibold text-[#ECF2FF] flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-blue-400" />
                Account Information
              </CardTitle>
              <CardDescription className="text-xs text-[#889DC2]">
                Your personal details registered with QueueLess.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#203052]/40 text-sm">
                <span className="text-[#889DC2]">Full Name</span>
                <span className="font-medium text-[#ECF2FF]">{user.name || "Not specified"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#203052]/40 text-sm">
                <span className="text-[#889DC2]">Email Address</span>
                <span className="font-medium text-[#ECF2FF]">{user.email || "Not specified"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#203052]/40 text-sm">
                <span className="text-[#889DC2]">Phone Number</span>
                <span className="font-medium text-[#ECF2FF]">
                  {user.phone ? user.phone : <span className="text-[#889DC2] italic">Not added</span>}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm">
                <span className="text-[#889DC2]">Account Type</span>
                <span className="font-medium text-[#ECF2FF] capitalize">{user.role}</span>
              </div>
            </CardContent>
          </Card>

          {/* Role-Specific Overview Card */}
          {isMerchant ? (
            /* Merchant Store Overview */
            <Card className="bg-[#101A32] border-[#203052] shadow-md flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-[#203052]/60">
                  <CardTitle className="text-lg font-semibold text-[#ECF2FF] flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-400" />
                    Business & Store Profile
                  </CardTitle>
                  <CardDescription className="text-xs text-[#889DC2]">
                    Operational status and public store details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-[#203052]/40 text-sm">
                    <span className="text-[#889DC2]">Shop Name</span>
                    <span className="font-medium text-[#ECF2FF]">
                      {user.businessProfile?.shopName || "My Store"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#203052]/40 text-sm">
                    <span className="text-[#889DC2] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" /> Address
                    </span>
                    <span className="font-medium text-[#ECF2FF] truncate max-w-[200px]">
                      {user.businessProfile?.address || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#203052]/40 text-sm">
                    <span className="text-[#889DC2] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" /> Working Hours
                    </span>
                    <span className="font-medium text-[#ECF2FF]">
                      {user.businessProfile?.workingHours?.openTime && user.businessProfile?.workingHours?.closeTime
                        ? `${user.businessProfile.workingHours.openTime} - ${user.businessProfile.workingHours.closeTime}`
                        : "Open 24/7"}
                    </span>
                  </div>
                </CardContent>
              </div>
              <div className="p-6 pt-0">
                <Link href="/dashboard">
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2">
                    Go to Business Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            /* Customer Activity Overview */
            <Card className="bg-[#101A32] border-[#203052] shadow-md flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-[#203052]/60">
                  <CardTitle className="text-lg font-semibold text-[#ECF2FF] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Queue Activity
                  </CardTitle>
                  <CardDescription className="text-xs text-[#889DC2]">
                    Summary of your digital bookings and visits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-[#0A1329] border border-[#203052] text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {activeQueuesCount ?? "—"}
                      </div>
                      <div className="text-xs text-[#889DC2] mt-1">Active Tickets</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0A1329] border border-[#203052] text-center">
                      <div className="text-2xl font-bold text-emerald-400">
                        {historyCount ?? "—"}
                      </div>
                      <div className="text-xs text-[#889DC2] mt-1">Past Bookings</div>
                    </div>
                  </div>
                  <p className="text-xs text-[#889DC2] leading-relaxed">
                    Track your current position in line or discover new stores to join digital queues without waiting on site.
                  </p>
                </CardContent>
              </div>
              <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full border-[#203052] hover:bg-[#152243] text-[#ECF2FF]">
                    View My Queues
                  </Button>
                </Link>
                <Link href="/scan" className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5">
                    <QrCode className="w-4 h-4" />
                    Scan & Join
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Danger Zone & Logout Section */}
        <div className="rounded-2xl border border-red-500/20 bg-[#101A32] p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#203052]">
            <div>
              <h3 className="text-base font-semibold text-[#ECF2FF] flex items-center gap-2">
                <LogOut className="w-4 h-4 text-blue-400" />
                Session Management
              </h3>
              <p className="text-xs text-[#889DC2] mt-1">
                Log out of your current session on this device.
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-[#203052] bg-[#152243] hover:bg-[#1e2f58] text-[#ECF2FF] flex items-center gap-2"
            >
              <LogOut className="w-4 h-4 text-blue-400" />
              Sign Out
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
            <div>
              <h3 className="text-base font-semibold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Danger Zone
              </h3>
              <p className="text-xs text-[#889DC2] mt-1 max-w-lg">
                Permanently delete your QueueLess account, ticket history, and associated settings. This action cannot be reversed.
              </p>
            </div>
            <Button
              onClick={() => setIsDeleteModalOpen(true)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-2 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-50 w-full max-w-lg rounded-2xl border border-[#203052] bg-[#101A32] p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-profile-title"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#203052]">
                <h2 id="edit-profile-title" className="text-lg font-bold text-[#ECF2FF] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  Edit Profile Details
                </h2>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-lg text-[#889DC2] hover:text-[#ECF2FF] hover:bg-[#152243]"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs text-[#C5D5F5] font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-[#0A1329] border-[#203052] text-[#ECF2FF] focus:border-blue-500"
                    placeholder="Your Full Name"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-xs text-[#889DC2] font-medium flex items-center justify-between">
                    <span>Email Address</span>
                    <span className="text-[10px] text-blue-400">Managed via login</span>
                  </Label>
                  <Input
                    id="edit-email"
                    value={user.email}
                    disabled
                    className="bg-[#050B18] border-[#203052]/60 text-[#889DC2] cursor-not-allowed opacity-80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-xs text-[#C5D5F5] font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    Phone Number
                  </Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-[#0A1329] border-[#203052] text-[#ECF2FF] focus:border-blue-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-password" className="text-xs text-[#C5D5F5] font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    New Password
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-[#0A1329] border-[#203052] text-[#ECF2FF] focus:border-blue-500"
                    placeholder="Leave blank to keep unchanged"
                  />
                  <p className="text-[11px] text-[#889DC2]">
                    Only enter a value if you wish to reset your account password.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#203052]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditOpen(false)}
                    className="border-[#203052] hover:bg-[#152243] text-[#ECF2FF]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white min-w-[120px]"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-50 w-full max-w-md rounded-2xl border border-red-500/40 bg-[#101A32] p-6 shadow-2xl"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              aria-describedby="delete-account-desc"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h2 id="delete-account-title" className="text-xl font-bold text-[#ECF2FF]">
                Delete your account?
              </h2>
              <p id="delete-account-desc" className="text-sm text-[#889DC2] mt-2 leading-relaxed">
                This action is <span className="text-red-400 font-semibold">irreversible</span>. All your personal data, active queue positions, tickets, and merchant configurations will be permanently wiped.
              </p>

              <div className="flex items-center justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="border-[#203052] hover:bg-[#152243] text-[#ECF2FF]"
                  disabled={isDeleting}
                >
                  Keep Account
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Account"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
